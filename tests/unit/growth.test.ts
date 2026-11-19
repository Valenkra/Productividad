import { describe, expect, it } from "vitest";
import {
  growthInfo,
  growthStage,
  growthUnits,
  MAX_STAGE,
  partialSeconds,
  STAGE_THRESHOLDS,
} from "@/features/garden/growth";
import { MemoryFocusRepository } from "@/server/repositories/memory-focus-repository";
import { createFocusService } from "@/server/services/focus-service";

describe("crecimiento", () => {
  it("60 s válidos = 1 unidad y conserva el parcial", () => {
    expect(growthUnits(59)).toBe(0);
    expect(growthUnits(60)).toBe(1);
    expect(growthUnits(103)).toBe(1);
    expect(partialSeconds(103)).toBe(43);
  });

  it("las etapas son monótonas y cambian exactamente en cada umbral", () => {
    let prev = 0;
    for (let s = 0; s < 60 * 300; s += 30) {
      const stage = growthStage(s);
      expect(stage).toBeGreaterThanOrEqual(prev);
      prev = stage;
    }
    STAGE_THRESHOLDS.forEach((units, stage) => {
      expect(growthStage(units * 60)).toBe(stage);
      if (units > 0) expect(growthStage(units * 60 - 1)).toBe(stage - 1);
    });
    expect(growthStage(60 * 180)).toBe(MAX_STAGE);
  });

  it("growthInfo informa progreso y minutos restantes", () => {
    const start = growthInfo(0);
    expect(start).toMatchObject({ stage: 0, unitsToNextStage: 5, stageProgress: 0 });
    const mid = growthInfo(2 * 60 + 30); // 2,5 de 5 min
    expect(mid.stageProgress).toBeCloseTo(0.5);
    expect(mid.unitsToNextStage).toBe(3);
    const max = growthInfo(60 * 500);
    expect(max).toMatchObject({
      stage: MAX_STAGE,
      unitsToNextStage: null,
      stageProgress: 1,
    });
  });

  it("valores negativos o corruptos no rompen el cálculo", () => {
    expect(growthInfo(-50).stage).toBe(0);
  });
});

describe("crecimiento + tracking: no duplica", () => {
  it("el total de la planta es la suma de lo acreditado, aunque se reintente", async () => {
    let t = 1_000_000;
    const svc = createFocusService({
      repo: new MemoryFocusRepository(),
      now: () => t,
      newId: (() => {
        let n = 0;
        return () => `id-${++n}`;
      })(),
    });
    const { session } = await svc.start("u", {});
    let expected = 0;
    for (let i = 0; i < 6; i++) {
      t += 20_000;
      const key = `retry-key-${i}`;
      const first = await svc.heartbeat("u", session!.id, key);
      const retry = await svc.heartbeat("u", session!.id, key);
      expect(retry.result).toBe("duplicate");
      expected += first.creditedSeconds;
    }
    const garden = await svc.getGarden("u");
    expect(garden.plantTotalSeconds).toBe(expected);
    expect(garden.plantTotalSeconds).toBe(120);
    // Persiste entre "sesiones de página": una consulta nueva ve lo mismo.
    expect(growthUnits((await svc.getGarden("u")).plantTotalSeconds)).toBe(2);
  });
});
