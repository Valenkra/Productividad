import { describe, expect, it } from "vitest";
import {
  finishSchema,
  heartbeatSchema,
  startSessionSchema,
} from "@/lib/validation/focus";
import { formatClock } from "@/lib/time/format";

describe("esquemas de sesión", () => {
  it("el heartbeat solo acepta una clave de idempotencia (nunca segundos)", () => {
    expect(heartbeatSchema.safeParse({ idempotencyKey: "abcdefgh" }).success).toBe(true);
    expect(heartbeatSchema.safeParse({ idempotencyKey: "corta" }).success).toBe(false);
    expect(heartbeatSchema.safeParse({ idempotencyKey: "x".repeat(101) }).success).toBe(
      false,
    );
    expect(heartbeatSchema.safeParse({}).success).toBe(false);
    // Campos extra (p. ej. segundos) se descartan: no llegan al servicio.
    const parsed = heartbeatSchema.parse({
      idempotencyKey: "abcdefgh",
      creditedSeconds: 9999,
    });
    expect(parsed).toEqual({ idempotencyKey: "abcdefgh" });
  });

  it("iniciar: taskId debe ser UUID y mode uno de los tres", () => {
    expect(startSessionSchema.safeParse({}).success).toBe(true);
    expect(startSessionSchema.safeParse({ taskId: null, mode: "focus" }).success).toBe(
      true,
    );
    expect(startSessionSchema.safeParse({ taskId: "no-es-uuid" }).success).toBe(false);
    expect(startSessionSchema.safeParse({ mode: "siesta" }).success).toBe(false);
  });

  it("terminar: solo completed | abandoned", () => {
    expect(finishSchema.safeParse({ outcome: "completed" }).success).toBe(true);
    expect(finishSchema.safeParse({ outcome: "abandoned" }).success).toBe(true);
    expect(finishSchema.safeParse({ outcome: "paused" }).success).toBe(false);
    expect(finishSchema.safeParse({}).success).toBe(false);
  });
});

describe("formatClock", () => {
  it.each([
    [0, "00:00"],
    [9, "00:09"],
    [60, "01:00"],
    [1500, "25:00"],
    [1122, "18:42"],
    [6000, "100:00"],
  ])("%s s → %s", (seconds, expected) => {
    expect(formatClock(seconds)).toBe(expected);
  });
});
