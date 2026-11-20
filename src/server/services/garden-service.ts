import { gardenPlants, type GardenPlant, type TaskInfo } from "@/features/garden/plants";
import type { FocusRepository } from "../repositories/focus-repository";

/** Jardín: una planta por foco completado, más el total histórico de segundos válidos. */
export function createGardenService(deps: {
  focusRepo: FocusRepository;
  /** Título y materia de las tareas del usuario, para las plantas. */
  describeTasks?: (userId: string) => Promise<Map<string, TaskInfo>>;
}) {
  const { focusRepo } = deps;
  return {
    async getGarden(
      userId: string,
    ): Promise<{ plantTotalSeconds: number; plants: GardenPlant[] }> {
      const [progress, sessions, tasks] = await Promise.all([
        focusRepo.getProgress(userId),
        focusRepo.listSessions(userId),
        deps.describeTasks?.(userId) ?? Promise.resolve(new Map<string, TaskInfo>()),
      ]);
      return {
        plantTotalSeconds: progress.plantTotalSeconds,
        plants: gardenPlants(sessions, tasks),
      };
    },
  };
}

export type GardenService = ReturnType<typeof createGardenService>;
