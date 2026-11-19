import { MemoryFocusRepository } from "./repositories/memory-focus-repository";
import { createFocusService, type FocusService } from "./services/focus-service";

// Sobrevive al hot-reload de desarrollo; en producción es un singleton del proceso.
const globalForServices = globalThis as unknown as { focusService?: FocusService };

export function getFocusService(): FocusService {
  globalForServices.focusService ??= createFocusService({
    repo: new MemoryFocusRepository(),
  });
  return globalForServices.focusService;
}
