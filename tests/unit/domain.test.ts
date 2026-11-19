import { describe, expect, it } from "vitest";
import {
  MAX_CREDIT_SECONDS,
  MIN_HEARTBEAT_SPACING_MS,
  STALE_TIMEOUT_MS,
} from "@/features/focus-tracking/config";
import {
  applyHeartbeat,
  createSession,
  finish,
  pause,
  reconcile,
  resume,
} from "@/features/focus-tracking/domain";

const T0 = 1_000_000;
const base = () =>
  createSession({
    id: "s",
    userId: "u",
    taskId: null,
    mode: "focus",
    plannedSeconds: 1500,
    now: T0,
  });
const hb = (s: ReturnType<typeof base>, now: number, key = "k") =>
  applyHeartbeat(s, { now, idempotencyKey: key, intervalId: "i" });

describe("createSession", () => {
  it("nace activa, sin crédito y con el cursor en el inicio", () => {
    expect(base()).toMatchObject({
      status: "active",
      creditedSeconds: 0,
      cursorAt: T0,
      startedAt: T0,
      pausedAt: null,
      endedAt: null,
    });
  });
});

describe("reconcile (timeout conservador)", () => {
  it("en el límite exacto NO vence; un ms después sí", () => {
    expect(reconcile(base(), T0 + STALE_TIMEOUT_MS).status).toBe("active");
    const stale = reconcile(base(), T0 + STALE_TIMEOUT_MS + 1);
    expect(stale.status).toBe("paused");
    expect(stale.pausedAt).toBe(T0); // se pausa en el último punto verificado, no en "ahora"
  });

  it("no toca sesiones que no están activas", () => {
    const paused = { ...base(), status: "paused" as const };
    expect(reconcile(paused, T0 + 10 * STALE_TIMEOUT_MS)).toBe(paused);
  });
});

describe("applyHeartbeat", () => {
  it("por debajo del espaciado mínimo: too_soon y no avanza el cursor", () => {
    const out = hb(base(), T0 + MIN_HEARTBEAT_SPACING_MS - 1);
    expect(out.status).toBe("too_soon");
    expect(out.session.cursorAt).toBe(T0);
    expect(out.interval).toBeNull();
  });

  it("justo en el espaciado mínimo ya acredita", () => {
    const out = hb(base(), T0 + MIN_HEARTBEAT_SPACING_MS);
    expect(out.status).toBe("credited");
    expect(out.creditedSeconds).toBe(5);
  });

  it("acredita segundos enteros y conserva el resto sub-segundo en el cursor", () => {
    const out = hb(base(), T0 + 15_700);
    expect(out.creditedSeconds).toBe(15);
    expect(out.session.cursorAt).toBe(T0 + 15_000); // los 700 ms se acreditan en el próximo
    const next = hb(out.session, T0 + 30_700, "k2");
    expect(next.creditedSeconds).toBe(15);
    expect(next.session.creditedSeconds).toBe(30);
  });

  it("nunca acredita más que el máximo por heartbeat", () => {
    const out = hb(base(), T0 + STALE_TIMEOUT_MS);
    expect(out.creditedSeconds).toBe(MAX_CREDIT_SECONDS);
  });

  it("no acredita por encima del tiempo planeado y completa la sesión", () => {
    const near = { ...base(), creditedSeconds: 1490 };
    const out = hb(near, T0 + 20_000);
    expect(out.creditedSeconds).toBe(10);
    expect(out.session).toMatchObject({
      status: "completed",
      creditedSeconds: 1500,
      endedAt: T0 + 20_000,
    });
  });

  it("el intervalo registrado describe exactamente lo acreditado", () => {
    const out = hb(base(), T0 + 15_000, "clave-1");
    expect(out.interval).toMatchObject({
      sessionId: "s",
      userId: "u",
      startedAt: T0,
      endedAt: T0 + 15_000,
      creditedSeconds: 15,
      idempotencyKey: "clave-1",
    });
  });

  it("sesión vencida: stale_paused sin acreditar", () => {
    const out = hb(base(), T0 + STALE_TIMEOUT_MS + 1);
    expect(out).toMatchObject({
      status: "stale_paused",
      creditedSeconds: 0,
      interval: null,
    });
    expect(out.session.status).toBe("paused");
  });

  it("sesión pausada o terminada: not_active", () => {
    expect(hb({ ...base(), status: "paused" }, T0 + 15_000).status).toBe("not_active");
    expect(hb({ ...base(), status: "completed" }, T0 + 15_000).status).toBe("not_active");
  });

  it("no muta la sesión original", () => {
    const s = base();
    hb(s, T0 + 15_000);
    expect(s.creditedSeconds).toBe(0);
  });
});

describe("pause / resume", () => {
  it("pausar no acredita y registra la hora", () => {
    const out = pause(base(), T0 + 9_000);
    expect(out).toMatchObject({
      status: "paused",
      pausedAt: T0 + 9_000,
      creditedSeconds: 0,
    });
  });

  it("pausar una sesión ya pausada es idempotente", () => {
    const paused = pause(base(), T0 + 9_000);
    expect(pause(paused, T0 + 20_000)).toBe(paused);
  });

  it("pausar una sesión vencida la deja pausada en el último punto verificado", () => {
    expect(pause(base(), T0 + STALE_TIMEOUT_MS + 5_000).pausedAt).toBe(T0);
  });

  it("reanudar mueve el cursor a ahora: el tiempo pausado no se acredita", () => {
    const resumed = resume(pause(base(), T0 + 9_000), T0 + 600_000);
    expect(resumed).toMatchObject({
      status: "active",
      cursorAt: T0 + 600_000,
      pausedAt: null,
    });
  });

  it("reanudar algo que no está pausado no cambia nada", () => {
    const s = base();
    expect(resume(s, T0 + 5_000)).toBe(s);
  });
});

describe("finish", () => {
  it("abandonar siempre se permite en sesiones abiertas", () => {
    const r = finish(base(), "abandoned", T0 + 1_000);
    expect(r).toMatchObject({
      ok: true,
      session: { status: "abandoned", endedAt: T0 + 1_000 },
    });
  });

  it("completar exige el tiempo planeado acreditado", () => {
    expect(finish(base(), "completed", T0)).toEqual({
      ok: false,
      reason: "not_finished",
    });
    const done = { ...base(), creditedSeconds: 1500 };
    expect(finish(done, "completed", T0)).toMatchObject({ ok: true });
  });

  it("no se puede terminar dos veces", () => {
    for (const status of ["completed", "abandoned"] as const) {
      expect(finish({ ...base(), status }, "abandoned", T0)).toEqual({
        ok: false,
        reason: "not_open",
      });
    }
  });

  it("limpia pausedAt al terminar", () => {
    const paused = pause(base(), T0 + 1_000);
    const r = finish(paused, "abandoned", T0 + 2_000);
    expect(r.ok && r.session.pausedAt).toBeNull();
  });
});
