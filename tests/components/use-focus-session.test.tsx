// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HEARTBEAT_INTERVAL_SECONDS,
  MAX_CREDIT_SECONDS,
} from "@/features/focus-tracking/config";
import { useFocusSession } from "@/features/focus-tracking/use-focus-session";
import { createTestService, installFakeApi, type FakeApi } from "../helpers/fake-api";

let ctx: ReturnType<typeof createTestService>;
let api: FakeApi;
let visibility: "visible" | "hidden";
let focused: boolean;
let online: boolean;
let beacon: ReturnType<typeof vi.fn>;

const fire = (target: EventTarget, type: string) =>
  act(async () => {
    target.dispatchEvent(new Event(type, { bubbles: true }));
  });

/** Avanza a la vez el reloj del servidor y los timers del navegador. */
const tick = (seconds: number) =>
  act(async () => {
    ctx.advance(seconds);
    await vi.advanceTimersByTimeAsync(seconds * 1000);
  });

const heartbeats = () => api.calls.filter((c) => c.url.endsWith("/heartbeat"));

async function setup() {
  const hook = renderHook(() => useFocusSession());
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  return hook;
}

async function startFocus(hook: Awaited<ReturnType<typeof setup>>) {
  await act(async () => {
    await hook.result.current.start();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  visibility = "visible";
  focused = true;
  online = true;
  ctx = createTestService();
  api = installFakeApi(ctx.service);
  beacon = vi.fn(() => true);
  Object.defineProperty(navigator, "sendBeacon", { value: beacon, configurable: true });
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibility,
  });
  vi.spyOn(document, "hasFocus").mockImplementation(() => focused);
  Object.defineProperty(navigator, "onLine", { configurable: true, get: () => online });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useFocusSession", () => {
  it("carga el estado real del servidor: sin sesión al inicio", async () => {
    const { result } = await setup();
    expect(result.current.loading).toBe(false);
    expect(result.current.session).toBeNull();
    expect(result.current.counting).toBe(false);
  });

  it("recupera una sesión abierta tras recargar, con el crédito del servidor", async () => {
    const { session } = await ctx.service.start("u", {});
    ctx.advance(15);
    await ctx.service.heartbeat("u", session!.id, "previo-0001");
    const { result } = await setup();
    expect(result.current.session?.creditedSeconds).toBe(15);
    expect(result.current.displayedSeconds).toBe(15);
  });

  it("al iniciar cuenta, y envía un heartbeat cada 15 s con claves distintas", async () => {
    const hook = await setup();
    await startFocus(hook);
    expect(hook.result.current.counting).toBe(true);

    await tick(HEARTBEAT_INTERVAL_SECONDS);
    await tick(HEARTBEAT_INTERVAL_SECONDS);
    await tick(HEARTBEAT_INTERVAL_SECONDS);

    const calls = heartbeats();
    expect(calls).toHaveLength(3);
    expect(
      new Set(calls.map((c) => (c.body as { idempotencyKey: string }).idempotencyKey))
        .size,
    ).toBe(3);
    expect(hook.result.current.session?.creditedSeconds).toBe(45);
    expect(hook.result.current.state?.plantTotalSeconds).toBe(45);
  });

  it("nunca envía segundos acreditados: solo la clave de idempotencia", async () => {
    const hook = await setup();
    await startFocus(hook);
    await tick(15);
    expect(Object.keys(heartbeats()[0].body as object)).toEqual(["idempotencyKey"]);
  });

  it("un heartbeat fallido se reintenta con LA MISMA clave y no duplica tiempo", async () => {
    const hook = await setup();
    await startFocus(hook);
    api.failNext(1);
    await tick(15); // falla por red
    expect(hook.result.current.error).toMatch(/No se pudo confirmar/);
    await tick(15); // reintento

    const [first, second] = heartbeats().map(
      (c) => (c.body as { idempotencyKey: string }).idempotencyKey,
    );
    expect(second).toBe(first);
    expect(hook.result.current.session?.creditedSeconds).toBe(30); // 30 s reales, ni uno más
    expect(hook.result.current.error).toBeNull();
    // Tras confirmar, la siguiente clave es nueva.
    await tick(15);
    const third = (heartbeats()[2].body as { idempotencyKey: string }).idempotencyKey;
    expect(third).not.toBe(first);
  });

  it("sin confirmación del servidor, el reloj visual no se adelanta más del tope", async () => {
    const hook = await setup();
    await startFocus(hook);
    api.failNext(1000);
    for (let i = 0; i < 8; i++) await tick(15);
    expect(hook.result.current.session?.creditedSeconds).toBe(0);
    expect(hook.result.current.displayedSeconds).toBeLessThanOrEqual(MAX_CREDIT_SECONDS);
  });

  it("al ocultar la pestaña se pausa en el servidor, avisa y deja de enviar heartbeats", async () => {
    const hook = await setup();
    await startFocus(hook);
    await tick(15);
    visibility = "hidden";
    await fire(document, "visibilitychange");

    expect(hook.result.current.session?.status).toBe("paused");
    expect(hook.result.current.notice).toMatch(/saliste de la app/);
    expect(hook.result.current.counting).toBe(false);
    const before = heartbeats().length;
    await tick(60);
    expect(heartbeats()).toHaveLength(before);
    expect(hook.result.current.session?.creditedSeconds).toBe(15);
  });

  it("al perder el foco de la ventana también se pausa", async () => {
    const hook = await setup();
    await startFocus(hook);
    focused = false;
    await fire(window, "blur");
    expect(hook.result.current.session?.status).toBe("paused");
  });

  it("reanudar tras volver reinicia la cuenta sin acreditar el tiempo ausente", async () => {
    const hook = await setup();
    await startFocus(hook);
    visibility = "hidden";
    await fire(document, "visibilitychange");
    await tick(300);
    visibility = "visible";
    await fire(document, "visibilitychange");
    await act(async () => {
      await hook.result.current.resume();
    });
    expect(hook.result.current.counting).toBe(true);
    await tick(15);
    expect(hook.result.current.session?.creditedSeconds).toBe(15);
  });

  it("sin conexión: no cuenta ni envía heartbeats", async () => {
    const hook = await setup();
    await startFocus(hook);
    online = false;
    await fire(window, "offline");
    expect(hook.result.current.online).toBe(false);
    expect(hook.result.current.counting).toBe(false);
    const before = heartbeats().length;
    await tick(60);
    expect(heartbeats()).toHaveLength(before);
    expect(hook.result.current.displayedSeconds).toBeLessThanOrEqual(0);
  });

  it("si el heartbeat llega tarde, el servidor pausó la sesión: se avisa y no se acredita", async () => {
    const hook = await setup();
    await startFocus(hook);
    api.beforeNext(() => ctx.advance(600)); // la app estuvo suspendida (p. ej. iOS)
    await tick(15);
    expect(hook.result.current.session?.status).toBe("paused");
    expect(hook.result.current.session?.creditedSeconds).toBe(0);
    expect(hook.result.current.notice).toMatch(/no se pudo confirmar/);
  });

  it("al ocultar la página envía una pausa con sendBeacon", async () => {
    const hook = await setup();
    await startFocus(hook);
    const id = hook.result.current.session!.id;
    await fire(window, "pagehide");
    expect(beacon).toHaveBeenCalledWith(`/api/focus-sessions/${id}/pause`);
  });

  it("terminar (saltar) cierra la sesión y deja lista la siguiente fase", async () => {
    const hook = await setup();
    await startFocus(hook);
    await act(async () => {
      await hook.result.current.finish("abandoned");
    });
    expect(hook.result.current.session?.status).toBe("abandoned");
    expect(hook.result.current.open).toBe(false);
    expect(hook.result.current.state?.nextMode).toBe("focus");
  });

  it("muestra el error del servidor (p. ej. sesión ya abierta) sin romperse", async () => {
    const hook = await setup();
    await startFocus(hook);
    await act(async () => {
      await hook.result.current.start();
    });
    expect(hook.result.current.error).toMatch(/sesión abierta/);
  });
});
