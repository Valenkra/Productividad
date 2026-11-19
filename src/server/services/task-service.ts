import { randomUUID } from "node:crypto";
import {
  applyTaskUpdate,
  createTask,
  filterTasks,
  sortTasks,
} from "@/features/tasks/domain";
import type {
  CreateTaskInput,
  ListQuery,
  UpdateTaskInput,
} from "@/features/tasks/schema";
import type { Task } from "@/features/tasks/types";
import { DomainError } from "../errors";
import type { TaskRepository } from "../repositories/task-repository";

export function createTaskService(deps: {
  repo: TaskRepository;
  now?: () => number;
  newId?: () => string;
}) {
  const { repo } = deps;
  const now = deps.now ?? Date.now;
  const newId = deps.newId ?? randomUUID;

  async function load(userId: string, id: string): Promise<Task> {
    const task = await repo.get(userId, id);
    if (!task) throw new DomainError("task_not_found", 404, "Tarea no encontrada");
    return task;
  }

  return {
    async list(userId: string, query: ListQuery): Promise<Task[]> {
      return sortTasks(filterTasks(await repo.list(userId), query), query.sort);
    },

    get: load,

    async create(userId: string, input: CreateTaskInput): Promise<Task> {
      const task = createTask({
        id: newId(),
        userId,
        input,
        position: (await repo.maxPosition(userId)) + 1,
        now: now(),
      });
      await repo.insert(task);
      return task;
    },

    async update(userId: string, id: string, patch: UpdateTaskInput): Promise<Task> {
      const next = applyTaskUpdate(await load(userId, id), patch, now());
      await repo.save(next);
      return next;
    },

    async remove(userId: string, id: string): Promise<void> {
      if (!(await repo.delete(userId, id))) {
        throw new DomainError("task_not_found", 404, "Tarea no encontrada");
      }
    },

    /** ¿La tarea existe y es de este usuario? Lo usa el servicio de sesiones. */
    async ownsTask(userId: string, id: string): Promise<boolean> {
      return (await repo.get(userId, id)) !== null;
    },
  };
}

export type TaskService = ReturnType<typeof createTaskService>;
