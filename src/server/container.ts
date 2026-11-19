import { MemoryFocusRepository } from "./repositories/memory-focus-repository";
import { MemoryTaskRepository } from "./repositories/memory-task-repository";
import { createFocusService, type FocusService } from "./services/focus-service";
import { createTaskService, type TaskService } from "./services/task-service";

// Sobreviven al hot-reload de desarrollo; en producción son singletons del proceso.
const g = globalThis as unknown as {
  services?: { focus: FocusService; tasks: TaskService };
};

function services() {
  if (!g.services) {
    const tasks = createTaskService({ repo: new MemoryTaskRepository() });
    const focus = createFocusService({
      repo: new MemoryFocusRepository(),
      ownsTask: tasks.ownsTask,
    });
    g.services = { focus, tasks };
  }
  return g.services;
}

export const getFocusService = (): FocusService => services().focus;
export const getTaskService = (): TaskService => services().tasks;
