import { vi } from "vitest";
import { ZodError } from "zod";
import { MemoryFocusRepository } from "@/server/repositories/memory-focus-repository";
import { MemorySettingsRepository } from "@/server/repositories/memory-settings-repository";
import { MemoryTaskRepository } from "@/server/repositories/memory-task-repository";
import { DomainError } from "@/server/errors";
import {
  createTaskSchema,
  listQuerySchema,
  updateTaskSchema,
} from "@/features/tasks/schema";
import { createServices } from "@/server/services";

/** Servicios reales + repositorios en memoria + reloj controlable. */
export function createTestService() {
  let t = Date.UTC(2026, 2, 10, 15, 0, 0);
  let n = 0;
  const newId = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
  const repo = new MemoryFocusRepository();
  const services = createServices({
    focusRepo: repo,
    taskRepo: new MemoryTaskRepository(),
    settingsRepo: new MemorySettingsRepository(),
    now: () => t,
    newId,
  });
  return {
    service: services.focus,
    tasks: services.tasks,
    settings: services.settings,
    stats: services.stats,
    garden: services.garden,
    repo,
    now: () => t,
    advance: (seconds: number) => {
      t += seconds * 1000;
    },
  };
}

type TestContext = ReturnType<typeof createTestService>;

export interface FakeApi {
  calls: { url: string; method: string; body: unknown }[];
  /** Hace que las próximas N peticiones fallen como un corte de red. */
  failNext(count: number): void;
  /** Aplica un efecto en el servidor justo ANTES de resolver la siguiente petición. */
  beforeNext(fn: () => void): void;
}

/**
 * Sustituye `fetch` por una implementación que enruta a los servicios reales
 * (mismas reglas de negocio que los endpoints), para probar el cliente sin red.
 */
export function installFakeApi(ctx: TestContext, userId = "u"): FakeApi {
  const { service, tasks, settings, stats, garden } = ctx;
  const api: FakeApi = {
    calls: [],
    failNext(count) {
      failures = count;
    },
    beforeNext(fn) {
      hook = fn;
    },
  };
  let failures = 0;
  let hook: (() => void) | null = null;

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });

  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      api.calls.push({ url: input, method, body });
      if (failures > 0) {
        failures--;
        throw new TypeError("Failed to fetch");
      }
      if (hook) {
        const run = hook;
        hook = null;
        run();
      }
      try {
        if (input.startsWith("/api/stats")) {
          const tz = new URL(input, "http://x").searchParams.get("tz") ?? "UTC";
          return json(200, await stats.getStats(userId, tz));
        }
        if (input.startsWith("/api/garden"))
          return json(200, await garden.getGarden(userId));
        if (input.startsWith("/api/settings")) {
          if (method === "PATCH") {
            return json(200, await settings.updateSettings(userId, body));
          }
          return json(200, await settings.getSettings(userId));
        }
        if (input.startsWith("/api/tasks")) {
          const url = new URL(input, "http://x");
          const id = url.pathname.split("/")[3];
          if (!id && method === "GET") {
            const query = listQuerySchema.parse(Object.fromEntries(url.searchParams));
            return json(200, { tasks: await tasks.list(userId, query) });
          }
          if (!id && method === "POST") {
            return json(200, {
              task: await tasks.create(userId, createTaskSchema.parse(body)),
            });
          }
          if (id && method === "PATCH") {
            return json(200, {
              task: await tasks.update(userId, id, updateTaskSchema.parse(body)),
            });
          }
          if (id && method === "DELETE") {
            await tasks.remove(userId, id);
            return json(200, { deleted: true });
          }
        }
        const path = input.replace(/^\/api\/focus-sessions/, "");
        if (path === "/active") return json(200, await service.getActive(userId));
        if (path === "" && method === "POST")
          return json(200, await service.start(userId, body ?? {}));
        const [, id, action] = path.split("/");
        if (action === "heartbeat")
          return json(200, await service.heartbeat(userId, id, body.idempotencyKey));
        if (action === "pause") return json(200, await service.pause(userId, id));
        if (action === "resume") return json(200, await service.resume(userId, id));
        if (action === "complete")
          return json(200, await service.finish(userId, id, body.outcome));
        return json(404, { error: { message: "ruta desconocida" } });
      } catch (e) {
        if (e instanceof ZodError)
          return json(400, { error: { code: "validation", message: "Datos inválidos" } });
        if (e instanceof DomainError)
          return json(e.status, { error: { code: e.code, message: e.message } });
        throw e;
      }
    }),
  );
  return api;
}
