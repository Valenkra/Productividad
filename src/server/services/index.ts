import { completedFocusByTask } from "@/features/tasks/domain";
import type { FocusRepository } from "../repositories/focus-repository";
import type { SettingsRepository } from "../repositories/settings-repository";
import type { TaskRepository } from "../repositories/task-repository";
import { createFocusService } from "./focus-service";
import { createGardenService } from "./garden-service";
import { createSettingsService } from "./settings-service";
import { createStatsService } from "./stats-service";
import { createTaskService } from "./task-service";

/**
 * Cablea todos los servicios sobre unos repositorios. Lo usan el contenedor de la app y
 * los tests (mismo cableado, distinto almacén/reloj). Tareas y foco no se importan entre sí.
 */
export function createServices(deps: {
  focusRepo: FocusRepository;
  taskRepo: TaskRepository;
  settingsRepo: SettingsRepository;
  now?: () => number;
  newId?: () => string;
}) {
  const { focusRepo, now, newId } = deps;
  const settings = createSettingsService({ repo: deps.settingsRepo });
  const tasks = createTaskService({
    repo: deps.taskRepo,
    now,
    newId,
    completedByTask: async (userId) =>
      completedFocusByTask(await focusRepo.listSessions(userId)),
  });
  const focus = createFocusService({
    repo: focusRepo,
    now,
    newId,
    getSettings: settings.getSettings,
    ownsTask: tasks.ownsTask,
  });
  const stats = createStatsService({ focusRepo, getSettings: settings.getSettings, now });
  const garden = createGardenService({ focusRepo, describeTasks: tasks.describe });
  return { focus, tasks, settings, stats, garden };
}

export type Services = ReturnType<typeof createServices>;
