import { DEFAULT_USER_SETTINGS, type UserSettings } from "@/features/settings/schema";
import type { SettingsRepository } from "./settings-repository";

/** Implementación local en memoria. Temporal hasta Supabase. */
export class MemorySettingsRepository implements SettingsRepository {
  private settings = new Map<string, UserSettings>();

  async getSettings(userId: string) {
    return { ...(this.settings.get(userId) ?? DEFAULT_USER_SETTINGS) };
  }

  async saveSettings(userId: string, settings: UserSettings) {
    this.settings.set(userId, { ...settings });
  }
}
