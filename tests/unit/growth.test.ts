import { describe, expect, it } from "vitest";
import { growthStage, growthUnits, partialSeconds } from "@/features/garden/growth";

describe("crecimiento", () => {
  it("60 s válidos = 1 unidad y conserva el parcial", () => {
    expect(growthUnits(59)).toBe(0);
    expect(growthUnits(60)).toBe(1);
    expect(growthUnits(103)).toBe(1);
    expect(partialSeconds(103)).toBe(43);
  });

  it("las etapas son monótonas", () => {
    let prev = 0;
    for (let s = 0; s < 60 * 300; s += 30) {
      const stage = growthStage(s);
      expect(stage).toBeGreaterThanOrEqual(prev);
      prev = stage;
    }
    expect(growthStage(0)).toBe(0);
    expect(growthStage(60 * 180)).toBe(5);
  });
});
