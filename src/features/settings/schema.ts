import { z } from "zod";
import {
  DEFAULT_POMODORO_SETTINGS,
  pomodoroSettingsSchema,
} from "@/features/pomodoro/settings";

export const userSettingsSchema = pomodoroSettingsSchema.extend({
  dailyGoalMinutes: z.number().int().min(1).max(1440),
});
export type UserSettings = z.infer<typeof userSettingsSchema>;

export const updateSettingsSchema = userSettingsSchema.partial();

export const DEFAULT_USER_SETTINGS: UserSettings = {
  ...DEFAULT_POMODORO_SETTINGS,
  dailyGoalMinutes: 60,
};
