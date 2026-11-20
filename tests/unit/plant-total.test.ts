import { describe, expect, it } from "vitest";
import { MemoryFocusRepository } from "@/server/repositories/memory-focus-repository";
import { createFocusService } from "@/server/services/focus-service";
import { createGardenService } from "@/server/services/garden-service";

describe("total de la planta + tracking: no duplica", () => {
  it("el total de la planta es la suma de lo acreditado, aunque se reintente", async () => {
    let t = 1_000_000;
    const repo = new MemoryFocusRepository();
    const gardenService = createGardenService({ focusRepo: repo });
    const svc = createFocusService({
      repo,
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
    const garden = await gardenService.getGarden("u");
    expect(garden.plantTotalSeconds).toBe(expected);
    expect(garden.plantTotalSeconds).toBe(120);
    // Persiste entre "sesiones de página": una consulta nueva ve lo mismo.
    expect((await gardenService.getGarden("u")).plantTotalSeconds).toBe(120);
  });
});
