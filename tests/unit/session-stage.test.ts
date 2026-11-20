import { describe, expect, it } from "vitest";
import { nextStageIn, sessionStage } from "@/features/garden/growth";
import { createTestService } from "../helpers/fake-api";

const PLANNED = 1500; // 25 min → una etapa nueva cada 300 s

describe("sessionStage: la planta crece dentro de cada pomodoro", () => {
  it.each([
    [0, 0],
    [299, 0],
    [300, 1],
    [599, 1],
    [600, 2],
    [900, 3],
    [1200, 4],
    [1499, 4],
  ])("a los %s s de %s planeados está en la etapa %s", (elapsed, stage) => {
    expect(sessionStage(elapsed, PLANNED, false)).toBe(stage);
  });

  it("nunca pasa de Arbusto (4) hasta que la sesión se completa", () => {
    expect(sessionStage(PLANNED, PLANNED, false)).toBe(4);
    expect(sessionStage(PLANNED * 2, PLANNED, false)).toBe(4);
  });

  it("florece (5) solo al completarse", () => {
    expect(sessionStage(PLANNED, PLANNED, true)).toBe(5);
    expect(sessionStage(0, PLANNED, true)).toBe(5);
  });

  it("escala con la duración planeada", () => {
    expect(sessionStage(600, 3000, false)).toBe(1); // 50 min: 600 s = 1/5
    expect(sessionStage(599, 3000, false)).toBe(0);
  });

  it("es robusta con valores raros", () => {
    expect(sessionStage(-10, PLANNED, false)).toBe(0);
    expect(sessionStage(100, 0, false)).toBe(0);
  });
});

describe("nextStageIn: segundos hasta la próxima etapa", () => {
  it("cuenta hasta el siguiente umbral", () => {
    expect(nextStageIn(0, PLANNED)).toBe(300);
    expect(nextStageIn(100, PLANNED)).toBe(200);
    expect(nextStageIn(299, PLANNED)).toBe(1);
    expect(nextStageIn(300, PLANNED)).toBe(300);
  });

  it("en la última etapa antes de florecer no hay próxima (null)", () => {
    expect(nextStageIn(1200, PLANNED)).toBeNull();
    expect(nextStageIn(1499, PLANNED)).toBeNull();
  });
});

describe("estado del ciclo en el servidor", () => {
  it("informa cuántos focos van completados en el ciclo", async () => {
    const ctx = createTestService();
    expect((await ctx.service.getActive("u")).cycleFocusCount).toBe(0);
    const { session } = await ctx.service.start("u", {});
    for (let i = 0; i < 101; i++) {
      ctx.advance(15);
      await ctx.service.heartbeat("u", session!.id, `k-${i}-xxxxxx`);
    }
    const after = await ctx.service.getActive("u");
    expect(after.cycleFocusCount).toBe(1);
    expect(after.nextMode).toBe("short_break");
  });
});
