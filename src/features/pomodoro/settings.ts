import { z } from "zod";

export const pomodoroSettingsSchema = z.object({
  focusMinutes: z.number().int().min(1).max(180),
  shortBreakMinutes: z.number().int().min(1).max(60),
  longBreakMinutes: z.number().int().min(1).max(120),
  longBreakInterval: z.number().int().min(2).max(12),
});
export type PomodoroSettings = z.infer<typeof pomodoroSettingsSchema>;

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakInterval: 4,
};
