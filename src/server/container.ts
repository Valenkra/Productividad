import { MemoryFocusRepository } from "./repositories/memory-focus-repository";
import { MemorySettingsRepository } from "./repositories/memory-settings-repository";
import { MemoryTaskRepository } from "./repositories/memory-task-repository";
import { createServices, type Services } from "./services";

// Sobreviven al hot-reload de desarrollo; en producción son singletons del proceso.
const g = globalThis as unknown as { services?: Services };

function services(): Services {
  g.services ??= createServices({
    focusRepo: new MemoryFocusRepository(),
    taskRepo: new MemoryTaskRepository(),
    settingsRepo: new MemorySettingsRepository(),
  });
  return g.services;
}

export const getFocusService = () => services().focus;
export const getTaskService = () => services().tasks;
export const getSettingsService = () => services().settings;
export const getStatsService = () => services().stats;
export const getGardenService = () => services().garden;
