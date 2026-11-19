import { describe, expect, it } from "vitest";
import {
  finishSchema,
  heartbeatSchema,
  startSessionSchema,
} from "@/lib/validation/focus";
import { formatDayLabel, formatMinutes } from "@/lib/time/format";

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

describe("formatMinutes", () => {
  it.each([
    [0, "0 min"],
    [29, "0 min"],
    [30, "1 min"],
    [60, "1 min"],
    [3540, "59 min"],
    [3600, "1 h 00 min"],
    [3660, "1 h 01 min"],
    [7500, "2 h 05 min"],
  ])("%s s → %s", (seconds, expected) => {
    expect(formatMinutes(seconds)).toBe(expected);
  });
});

describe("formatDayLabel", () => {
  it("no cambia de día por la zona horaria del equipo", () => {
    expect(formatDayLabel("2026-03-10")).toMatch(/10/);
    expect(formatDayLabel("2026-03-01")).toMatch(/1/);
  });
});
