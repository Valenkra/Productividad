import { z } from "zod";
import {
  DEFAULT_POMODORO_SETTINGS,
  pomodoroSettingsSchema,
} from "@/features/pomodoro/settings";

export const userSettingsSchema = pomodoroSettingsSchema.extend({
  dailyGoalMinutes: z.number().int().min(1).max(1440),
  /** Empezar el descanso solo al terminar un foco. */
  autoStartBreak: z.boolean(),
  /** Sonido al terminar una fase. */
  sound: z.boolean(),
  /** Nombre visible para el saludo de Foco ("" = sin nombre). */
  displayName: z.string().trim().max(40),
  /** El usuario ya vio (o saltó) la introducción. */
  onboardingDone: z.boolean(),
});
export type UserSettings = z.infer<typeof userSettingsSchema>;

export const updateSettingsSchema = userSettingsSchema.partial();

export const DEFAULT_USER_SETTINGS: UserSettings = {
  ...DEFAULT_POMODORO_SETTINGS,
  dailyGoalMinutes: 60,
  autoStartBreak: true,
  sound: true,
  displayName: "",
  onboardingDone: false,
};
