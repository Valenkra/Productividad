import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestService } from "../helpers/fake-api";

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));

let ctx: ReturnType<typeof createTestService>;
vi.mock("@/server/container", () => ({ getFocusService: () => ctx.service }));

const sessions = await import("@/app/api/focus-sessions/route");
const active = await import("@/app/api/focus-sessions/active/route");
const heartbeat = await import("@/app/api/focus-sessions/[id]/heartbeat/route");
const pauseRoute = await import("@/app/api/focus-sessions/[id]/pause/route");
const resumeRoute = await import("@/app/api/focus-sessions/[id]/resume/route");
const complete = await import("@/app/api/focus-sessions/[id]/complete/route");
const garden = await import("@/app/api/garden/route");
const settings = await import("@/app/api/settings/route");
const stats = await import("@/app/api/stats/route");

const req = (body?: unknown) =>
  new Request("http://x/api", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

async function startSession() {
  const res = await sessions.POST(req({}));
  return (await res.json()).session.id as string;
}

beforeEach(() => {
  ctx = createTestService();
});

describe("POST /api/focus-sessions", () => {
  it("crea una sesión de foco activa", async () => {
    const res = await sessions.POST(req({}));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.session).toMatchObject({
      mode: "focus",
      status: "active",
      creditedSeconds: 0,
    });
    expect(body.nextPlannedSeconds).toBe(1500);
  });

  it("409 si ya hay una sesión abierta", async () => {
    await startSession();
    const res = await sessions.POST(req({}));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("session_open");
  });

  it("400 con taskId inválido o modo desconocido", async () => {
    expect((await sessions.POST(req({ taskId: "nope" }))).status).toBe(400);
    expect((await sessions.POST(req({ mode: "siesta" }))).status).toBe(400);
  });

  it("404 si la tarea no pertenece al usuario", async () => {
    const res = await sessions.POST(
      req({ taskId: "11111111-1111-4111-8111-111111111111" }),
    );
    expect(res.status).toBe(404);
  });
});

describe("GET /api/focus-sessions/active", () => {
  it("sin sesión → session null y próxima fase", async () => {
    const body = await (await active.GET()).json();
    expect(body).toMatchObject({
      session: null,
      nextMode: "focus",
      plantTotalSeconds: 0,
    });
  });

  it("con sesión → la devuelve", async () => {
    const id = await startSession();
    expect((await (await active.GET()).json()).session.id).toBe(id);
  });
});

describe("heartbeat", () => {
  it("acredita según el reloj del servidor e ignora campos extra del cliente", async () => {
    const id = await startSession();
    ctx.advance(15);
    const res = await heartbeat.POST(
      req({ idempotencyKey: "clave-0001", creditedSeconds: 9999, now: 0 }),
      params(id),
    );
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      result: "credited",
      creditedSeconds: 15,
      plantTotalSeconds: 15,
    });
  });

  it("reintento con la misma clave no duplica", async () => {
    const id = await startSession();
    ctx.advance(15);
    await heartbeat.POST(req({ idempotencyKey: "clave-0001" }), params(id));
    const retry = await (
      await heartbeat.POST(req({ idempotencyKey: "clave-0001" }), params(id))
    ).json();
    expect(retry).toMatchObject({ result: "duplicate", plantTotalSeconds: 15 });
  });

  it("400 sin clave o con cuerpo inválido; 404 con sesión ajena/inexistente", async () => {
    const id = await startSession();
    expect((await heartbeat.POST(req({}), params(id))).status).toBe(400);
    expect(
      (await heartbeat.POST(req({ idempotencyKey: "clave-0001" }), params("nope")))
        .status,
    ).toBe(404);
    const bad = new Request("http://x", { method: "POST", body: "{roto" });
    expect((await heartbeat.POST(bad, params(id))).status).toBe(400);
  });
});

describe("pause / resume / complete", () => {
  it("pausa y reanuda", async () => {
    const id = await startSession();
    expect((await (await pauseRoute.POST(req(), params(id))).json()).session.status).toBe(
      "paused",
    );
    expect(
      (await (await resumeRoute.POST(req(), params(id))).json()).session.status,
    ).toBe("active");
  });

  it("reanudar una sesión activa → 409", async () => {
    const id = await startSession();
    expect((await resumeRoute.POST(req(), params(id))).status).toBe(409);
  });

  it("completar antes de tiempo → 409; abandonar → ok y libera para iniciar otra", async () => {
    const id = await startSession();
    expect((await complete.POST(req({ outcome: "completed" }), params(id))).status).toBe(
      409,
    );
    expect((await complete.POST(req({ outcome: "paused" }), params(id))).status).toBe(
      400,
    );
    expect((await complete.POST(req({ outcome: "abandoned" }), params(id))).status).toBe(
      200,
    );
    expect((await sessions.POST(req({}))).status).toBe(200);
  });

  it("404 con id desconocido", async () => {
    for (const r of [pauseRoute, resumeRoute]) {
      expect((await r.POST(req(), params("nope"))).status).toBe(404);
    }
    expect(
      (await complete.POST(req({ outcome: "abandoned" }), params("nope"))).status,
    ).toBe(404);
  });
});

describe("garden / settings / stats", () => {
  it("garden refleja el tiempo acreditado", async () => {
    const id = await startSession();
    ctx.advance(20);
    await heartbeat.POST(req({ idempotencyKey: "clave-0001" }), params(id));
    // Sesión sin completar: suma al total pero aún no es una planta del jardín.
    expect(await (await garden.GET()).json()).toEqual({
      plantTotalSeconds: 20,
      plants: [],
    });
  });

  it("settings: lee, actualiza parcialmente y rechaza valores fuera de rango", async () => {
    expect((await (await settings.GET()).json()).focusMinutes).toBe(25);
    const patch = (b: unknown) =>
      settings.PATCH(
        new Request("http://x", { method: "PATCH", body: JSON.stringify(b) }),
      );
    const ok = await patch({ focusMinutes: 40 });
    expect(await ok.json()).toMatchObject({ focusMinutes: 40, shortBreakMinutes: 5 });
    expect((await patch({ focusMinutes: 0 })).status).toBe(400);
    expect((await (await settings.GET()).json()).focusMinutes).toBe(40);
  });

  it("settings: guarda preferencias, nombre y onboarding sin pisar lo demás", async () => {
    const patch = (b: unknown) =>
      settings.PATCH(
        new Request("http://x", { method: "PATCH", body: JSON.stringify(b) }),
      );
    const ok = await patch({
      autoStartBreak: false,
      sound: false,
      displayName: "Vale",
      onboardingDone: true,
    });
    expect(await ok.json()).toMatchObject({
      autoStartBreak: false,
      sound: false,
      displayName: "Vale",
      onboardingDone: true,
      focusMinutes: 25,
    });
    await patch({ focusMinutes: 30 });
    expect(await (await settings.GET()).json()).toMatchObject({
      displayName: "Vale",
      autoStartBreak: false,
      focusMinutes: 30,
    });
    expect((await patch({ displayName: "x".repeat(41) })).status).toBe(400);
  });

  it("stats: usa ?tz, valida la zona y por defecto UTC", async () => {
    const url = (q = "") => new Request(`http://x/api/stats${q}`);
    expect((await stats.GET(url("?tz=America/Montevideo"))).status).toBe(200);
    expect((await (await stats.GET(url())).json()).timeZone).toBe("UTC");
    const bad = await stats.GET(url("?tz=Nope/Nope"));
    expect(bad.status).toBe(400);
    expect((await bad.json()).error.code).toBe("invalid_timezone");
  });
});
