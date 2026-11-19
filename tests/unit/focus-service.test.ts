import { beforeEach, describe, expect, it } from "vitest";
import { MAX_CREDIT_SECONDS } from "@/features/focus-tracking/config";
import { MemoryFocusRepository } from "@/server/repositories/memory-focus-repository";
import { createFocusService, DomainError } from "@/server/services/focus-service";

const U = "user-a";
let t: number;
let n: number;
let repo: MemoryFocusRepository;
let svc: ReturnType<typeof createFocusService>;

const advance = (s: number) => {
  t += s * 1000;
};
const key = () => `key-${++n}-padding`;

beforeEach(() => {
  t = 1_000_000;
  n = 0;
  repo = new MemoryFocusRepository();
  let ids = 0;
  svc = createFocusService({ repo, now: () => t, newId: () => `id-${++ids}` });
});

async function startFocus() {
  const { session } = await svc.start(U, {});
  return session!;
}

describe("acreditación de tiempo", () => {
  it("acredita el tiempo transcurrido y hace crecer la planta", async () => {
    const s = await startFocus();
    advance(15);
    const r = await svc.heartbeat(U, s.id, key());
    expect(r.result).toBe("credited");
    expect(r.creditedSeconds).toBe(15);
    expect(r.session!.creditedSeconds).toBe(15);
    expect(r.plantTotalSeconds).toBe(15);
  });

  it("es idempotente: reintentar la misma clave no duplica", async () => {
    const s = await startFocus();
    advance(15);
    const k = key();
    await svc.heartbeat(U, s.id, k);
    advance(1);
    const retry = await svc.heartbeat(U, s.id, k);
    expect(retry.result).toBe("duplicate");
    expect(retry.creditedSeconds).toBe(15);
    expect(retry.plantTotalSeconds).toBe(15);
  });

  it("heartbeats demasiado seguidos no acreditan (anti-flood)", async () => {
    const s = await startFocus();
    advance(15);
    await svc.heartbeat(U, s.id, key());
    advance(2);
    const r = await svc.heartbeat(U, s.id, key());
    expect(r.result).toBe("too_soon");
    expect(r.plantTotalSeconds).toBe(15);
  });

  it("un heartbeat tardío pausa la sesión y no acredita el tiempo ausente", async () => {
    const s = await startFocus();
    advance(15);
    await svc.heartbeat(U, s.id, key());
    advance(600); // el usuario se fue 10 minutos
    const r = await svc.heartbeat(U, s.id, key());
    expect(r.result).toBe("stale_paused");
    expect(r.session!.status).toBe("paused");
    expect(r.plantTotalSeconds).toBe(15);
  });

  it("tolera UN heartbeat perdido pero acredita como máximo el tope", async () => {
    const s = await startFocus();
    advance(MAX_CREDIT_SECONDS);
    const r = await svc.heartbeat(U, s.id, key());
    expect(r.creditedSeconds).toBe(MAX_CREDIT_SECONDS);
  });

  it("pausar no acredita el tramo sin verificar y reanudar reinicia el cursor", async () => {
    const s = await startFocus();
    advance(10);
    const paused = await svc.pause(U, s.id);
    expect(paused.session!.status).toBe("paused");
    advance(300);
    await svc.resume(U, s.id);
    advance(15);
    const r = await svc.heartbeat(U, s.id, key());
    expect(r.creditedSeconds).toBe(15);
    expect(r.plantTotalSeconds).toBe(15);
  });

  it("completa al llegar al tiempo planeado y no acredita de más", async () => {
    const s = await startFocus(); // 1500 s
    let last;
    for (let i = 0; i < 60; i++) {
      advance(25);
      last = await svc.heartbeat(U, s.id, key());
      if (last.session!.status === "completed") break;
    }
    expect(last!.session!.status).toBe("completed");
    expect(last!.session!.creditedSeconds).toBe(1500);
    expect(last!.plantTotalSeconds).toBe(1500);
    expect(last!.nextMode).toBe("short_break");
  });

  it("los descansos no hacen crecer la planta", async () => {
    const s = await startFocus();
    await svc.finish(U, s.id, "abandoned");
    const { session } = await svc.start(U, { mode: "short_break" });
    advance(20);
    const r = await svc.heartbeat(U, session!.id, key());
    expect(r.creditedSeconds).toBe(20);
    expect(r.plantTotalSeconds).toBe(0);
  });

  it("ignora cambios de la hora del dispositivo: solo cuenta el reloj del servidor", async () => {
    // El cliente no envía hora ni segundos; el esquema de heartbeat solo lleva la clave.
    const s = await startFocus();
    advance(15);
    const r = await svc.heartbeat(U, s.id, key());
    expect(r.creditedSeconds).toBe(15);
  });
});

describe("sesiones y permisos", () => {
  it("una sola sesión abierta por usuario", async () => {
    await startFocus();
    await expect(svc.start(U, {})).rejects.toMatchObject({
      code: "session_open",
      status: 409,
    });
  });

  it("otro usuario no puede operar sobre la sesión", async () => {
    const s = await startFocus();
    await expect(svc.heartbeat("user-b", s.id, key())).rejects.toBeInstanceOf(
      DomainError,
    );
    await expect(svc.pause("user-b", s.id)).rejects.toMatchObject({ status: 404 });
  });

  it("rechaza asociar una tarea que no es del usuario", async () => {
    const taskId = "11111111-1111-4111-8111-111111111111";
    repo.registerTask("user-b", taskId);
    await expect(svc.start(U, { taskId })).rejects.toMatchObject({
      code: "task_not_found",
    });
    repo.registerTask(U, taskId);
    const { session } = await svc.start(U, { taskId });
    expect(session!.taskId).toBe(taskId);
  });

  it("no se puede completar antes de acreditar el tiempo planeado", async () => {
    const s = await startFocus();
    await expect(svc.finish(U, s.id, "completed")).rejects.toMatchObject({
      code: "not_finished",
    });
  });

  it("tras recargar, getActive devuelve el estado real (y pausa si venció)", async () => {
    const s = await startFocus();
    advance(15);
    await svc.heartbeat(U, s.id, key());
    advance(120);
    const state = await svc.getActive(U);
    expect(state.session!.status).toBe("paused");
    expect(state.session!.creditedSeconds).toBe(15);
  });
});

describe("ciclo Pomodoro", () => {
  it("descanso largo tras 4 focos completados y vuelta a foco", async () => {
    const modes: string[] = [];
    for (let i = 0; i < 4; i++) {
      const { session } = await svc.start(U, { mode: "focus" });
      // Completar acreditando todo
      let st;
      do {
        advance(25);
        st = await svc.heartbeat(U, session!.id, key());
      } while (st.session!.status !== "completed");
      modes.push(st.nextMode);
      if (i < 3) {
        const brk = await svc.start(U, {});
        await svc.finish(U, brk.session!.id, "abandoned");
      }
    }
    expect(modes).toEqual(["short_break", "short_break", "short_break", "long_break"]);
  });

  it("saltar un foco no habilita descanso", async () => {
    const s = await startFocus();
    const r = await svc.finish(U, s.id, "abandoned");
    expect(r.nextMode).toBe("focus");
  });
});
