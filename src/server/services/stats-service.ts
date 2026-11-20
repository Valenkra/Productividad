import { computeStats, isValidTimeZone } from "@/features/history/stats";
import type { UserSettings } from "@/features/settings/schema";
import { DomainError } from "../errors";
import type { FocusRepository } from "../repositories/focus-repository";

/** Estadísticas de estudio: solo lectura sobre sesiones e intervalos acreditados. */
export function createStatsService(deps: {
  focusRepo: FocusRepository;
  getSettings: (userId: string) => Promise<UserSettings>;
  now?: () => number;
}) {
  const { focusRepo, getSettings } = deps;
  const now = deps.now ?? Date.now;
  return {
    async getStats(userId: string, timeZone: string) {
      if (!isValidTimeZone(timeZone)) {
        throw new DomainError("invalid_timezone", 400, "Zona horaria inválida");
      }
      const [sessions, intervals, settings, progress] = await Promise.all([
        focusRepo.listSessions(userId),
        focusRepo.listIntervals(userId),
        getSettings(userId),
        focusRepo.getProgress(userId),
      ]);
      return {
        ...computeStats({
          sessions,
          intervals,
          timeZone,
          now: now(),
          dailyGoalSeconds: settings.dailyGoalMinutes * 60,
        }),
        plantTotalSeconds: progress.plantTotalSeconds,
      };
    },
  };
}

export type StatsService = ReturnType<typeof createStatsService>;
