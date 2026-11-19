import { describe, expect, it } from "vitest";
import { nextMode, plannedSecondsFor } from "@/features/pomodoro/sequence";
import {
  DEFAULT_POMODORO_SETTINGS,
  pomodoroSettingsSchema,
} from "@/features/pomodoro/settings";
import {
  DEFAULT_USER_SETTINGS,
  updateSettingsSchema,
  userSettingsSchema,
} from "@/features/settings/schema";

const S = DEFAULT_POMODORO_SETTINGS;

describe("nextMode", () => {
  it("sin historial o tras un descanso → foco", () => {
    expect(nextMode(0, null, S)).toBe("focus");
    expect(nextMode(2, "short_break", S)).toBe("focus");
    expect(nextMode(0, "long_break", S)).toBe("focus");
  });

  it("tras un foco → descanso corto hasta completar el ciclo", () => {
    expect(nextMode(1, "focus", S)).toBe("short_break");
    expect(nextMode(3, "focus", S)).toBe("short_break");
  });

  it("tras el N-ésimo foco → descanso largo", () => {
    expect(nextMode(4, "focus", S)).toBe("long_break");
    expect(nextMode(2, "focus", { ...S, longBreakInterval: 2 })).toBe("long_break");
  });
});

describe("plannedSecondsFor", () => {
  it("convierte minutos de ajustes a segundos por modo", () => {
    expect(plannedSecondsFor("focus", S)).toBe(1500);
    expect(plannedSecondsFor("short_break", S)).toBe(300);
    expect(plannedSecondsFor("long_break", S)).toBe(900);
    expect(plannedSecondsFor("focus", { ...S, focusMinutes: 50 })).toBe(3000);
  });
});

describe("esquemas de ajustes", () => {
  it("los valores por defecto cumplen el esquema", () => {
    expect(pomodoroSettingsSchema.safeParse(S).success).toBe(true);
    expect(userSettingsSchema.safeParse(DEFAULT_USER_SETTINGS).success).toBe(true);
  });

  it.each([
    ["focusMinutes", 0],
    ["focusMinutes", 181],
    ["focusMinutes", 1.5],
    ["shortBreakMinutes", 61],
    ["longBreakMinutes", 0],
    ["longBreakInterval", 1],
    ["longBreakInterval", 13],
    ["dailyGoalMinutes", 0],
    ["dailyGoalMinutes", 1441],
  ])("rechaza %s = %s", (key, value) => {
    expect(
      userSettingsSchema.safeParse({ ...DEFAULT_USER_SETTINGS, [key]: value }).success,
    ).toBe(false);
  });

  it("acepta los extremos válidos", () => {
    expect(
      userSettingsSchema.safeParse({
        focusMinutes: 1,
        shortBreakMinutes: 60,
        longBreakMinutes: 120,
        longBreakInterval: 12,
        dailyGoalMinutes: 1440,
      }).success,
    ).toBe(true);
  });

  it("la actualización parcial acepta subconjuntos pero valida lo que viene", () => {
    expect(updateSettingsSchema.safeParse({ dailyGoalMinutes: 90 }).success).toBe(true);
    expect(updateSettingsSchema.safeParse({}).success).toBe(true);
    expect(updateSettingsSchema.safeParse({ dailyGoalMinutes: -1 }).success).toBe(false);
  });
});
