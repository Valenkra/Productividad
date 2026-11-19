import { describe, expect, it } from "vitest";
import {
  DEMO_SECONDS,
  autoPauseDemo,
  demoProgress,
  demoRemainingSeconds,
  demoStage,
  initialDemo,
  pauseDemo,
  resetDemo,
  startDemo,
  tickDemo,
  type DemoState,
} from "@/features/landing/mini-focus";

const total = DEMO_SECONDS * 1000;
const running = (elapsedMs = 0): DemoState => ({
  status: "running",
  elapsedMs,
  autoPaused: false,
});

describe("mini-foco de la landing (demo local, sin servidor)", () => {
  it("empieza detenido, sin tiempo transcurrido", () => {
    expect(initialDemo).toEqual({ status: "idle", elapsedMs: 0, autoPaused: false });
    expect(demoRemainingSeconds(initialDemo)).toBe(DEMO_SECONDS);
  });

  it("dura un minuto (demo acelerada)", () => {
    expect(DEMO_SECONDS).toBe(60);
  });

  describe("tickDemo", () => {
    it("suma el tiempo solo si la pestaña está activa", () => {
      expect(tickDemo(running(), 250, true).elapsedMs).toBe(250);
      const hidden = tickDemo(running(1000), 250, false);
      expect(hidden.elapsedMs).toBe(1000);
      expect(hidden).toMatchObject({ status: "paused", autoPaused: true });
    });

    it("limita cada paso a 1 s: un salto de reloj o un timer atrasado no regala tiempo", () => {
      expect(tickDemo(running(), 30_000, true).elapsedMs).toBe(1000);
      expect(tickDemo(running(), -500, true).elapsedMs).toBe(0);
    });

    it("no hace nada si no está corriendo", () => {
      for (const status of ["idle", "paused", "done"] as const) {
        const s: DemoState = { status, elapsedMs: 5000, autoPaused: false };
        expect(tickDemo(s, 250, true)).toBe(s);
      }
    });

    it("al llegar al total pasa a «done» y no se pasa", () => {
      const done = tickDemo(running(total - 100), 1000, true);
      expect(done).toMatchObject({ status: "done", elapsedMs: total });
      expect(demoRemainingSeconds(done)).toBe(0);
    });
  });

  describe("controles", () => {
    it("start: arranca desde idle, reanuda desde pausa y reinicia desde done", () => {
      expect(startDemo(initialDemo).status).toBe("running");
      const paused: DemoState = { status: "paused", elapsedMs: 8000, autoPaused: true };
      expect(startDemo(paused)).toEqual({
        status: "running",
        elapsedMs: 8000,
        autoPaused: false,
      });
      const done: DemoState = { status: "done", elapsedMs: total, autoPaused: false };
      expect(startDemo(done)).toEqual({
        status: "running",
        elapsedMs: 0,
        autoPaused: false,
      });
    });

    it("start sobre algo ya corriendo no cambia nada", () => {
      const s = running(3000);
      expect(startDemo(s)).toBe(s);
    });

    it("pausa manual conserva el progreso y no es automática", () => {
      expect(pauseDemo(running(4000))).toEqual({
        status: "paused",
        elapsedMs: 4000,
        autoPaused: false,
      });
      const idle = initialDemo;
      expect(pauseDemo(idle)).toBe(idle);
    });

    it("autoPause solo afecta a una demo corriendo", () => {
      expect(autoPauseDemo(running(2000))).toMatchObject({
        status: "paused",
        autoPaused: true,
      });
      const done: DemoState = { status: "done", elapsedMs: total, autoPaused: false };
      expect(autoPauseDemo(done)).toBe(done);
    });

    it("reset vuelve al inicio", () => {
      expect(resetDemo()).toEqual(initialDemo);
    });
  });

  describe("progreso y etapa de la planta", () => {
    it("remaining redondea hacia arriba (nunca muestra 00:00 antes de terminar)", () => {
      expect(demoRemainingSeconds(running(0))).toBe(60);
      expect(demoRemainingSeconds(running(59_100))).toBe(1);
      expect(demoRemainingSeconds(running(500))).toBe(60);
      expect(demoRemainingSeconds(running(1000))).toBe(59);
    });

    it("progress va de 0 a 1", () => {
      expect(demoProgress(initialDemo)).toBe(0);
      expect(demoProgress(running(30_000))).toBe(0.5);
      expect(demoProgress({ status: "done", elapsedMs: total, autoPaused: false })).toBe(
        1,
      );
    });

    it.each([
      [0, 1],
      [14_900, 1],
      [15_000, 2],
      [29_900, 2],
      [30_000, 3],
      [44_900, 3],
      [45_000, 4],
      [59_900, 4],
    ])("a %s ms la planta está en la etapa %s", (elapsed, stage) => {
      expect(demoStage(running(elapsed))).toBe(stage);
    });

    it("arranca con una planta ya visible (brote), nunca una maceta vacía", () => {
      expect(demoStage(initialDemo)).toBeGreaterThanOrEqual(1);
    });

    it("al completar, la planta florece (etapa 5)", () => {
      expect(demoStage({ status: "done", elapsedMs: total, autoPaused: false })).toBe(5);
    });

    it("la etapa nunca retrocede mientras avanza el tiempo", () => {
      let prev = 0;
      for (let ms = 0; ms <= total; ms += 500) {
        const stage = demoStage(
          ms >= total
            ? { status: "done", elapsedMs: total, autoPaused: false }
            : running(ms),
        );
        expect(stage).toBeGreaterThanOrEqual(prev);
        prev = stage;
      }
    });
  });
});
