import type { UserSettings } from "@/features/settings/schema";

/** Ajustes por usuario (en Supabase: `pomodoro_settings` + `profiles`). */
export interface SettingsRepository {
  /** Los ajustes guardados, o los por defecto si el usuario nunca guardó. */
  getSettings(userId: string): Promise<UserSettings>;
  saveSettings(userId: string, settings: UserSettings): Promise<void>;
}
