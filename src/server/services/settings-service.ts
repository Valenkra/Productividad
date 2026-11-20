import type { UserSettings } from "@/features/settings/schema";
import type { SettingsRepository } from "../repositories/settings-repository";

export function createSettingsService(deps: { repo: SettingsRepository }) {
  const { repo } = deps;
  return {
    getSettings: (userId: string): Promise<UserSettings> => repo.getSettings(userId),

    async updateSettings(
      userId: string,
      patch: Partial<UserSettings>,
    ): Promise<UserSettings> {
      const next = { ...(await repo.getSettings(userId)), ...patch };
      await repo.saveSettings(userId, next);
      return next;
    },
  };
}

export type SettingsService = ReturnType<typeof createSettingsService>;
