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
import type { Task, TaskWithProgress } from "@/features/tasks/types";
import { DomainError } from "../errors";
import type { TaskRepository } from "../repositories/task-repository";

export function createTaskService(deps: {
  repo: TaskRepository;
  now?: () => number;
  newId?: () => string;
  /** Pomodoros completados por id de tarea (de las sesiones). Sin esto, siempre 0. */
  completedByTask?: (userId: string) => Promise<Map<string, number>>;
}) {
  const { repo } = deps;
  const now = deps.now ?? Date.now;
  const newId = deps.newId ?? randomUUID;

  const withProgress = async (
    userId: string,
    tasks: Task[],
  ): Promise<TaskWithProgress[]> => {
    const counts = (await deps.completedByTask?.(userId)) ?? new Map<string, number>();
    return tasks.map((t) => ({ ...t, completedPomodoros: counts.get(t.id) ?? 0 }));
  };

  async function load(userId: string, id: string): Promise<Task> {
    const task = await repo.get(userId, id);
    if (!task) throw new DomainError("task_not_found", 404, "Tarea no encontrada");
    return task;
  }

  return {
    async list(userId: string, query: ListQuery): Promise<TaskWithProgress[]> {
      return withProgress(
        userId,
        sortTasks(filterTasks(await repo.list(userId), query), query.sort),
      );
    },

    async get(userId: string, id: string): Promise<TaskWithProgress> {
      return (await withProgress(userId, [await load(userId, id)]))[0];
    },

    async create(userId: string, input: CreateTaskInput): Promise<TaskWithProgress> {
      const task = createTask({
        id: newId(),
        userId,
        input,
        position: (await repo.maxPosition(userId)) + 1,
        now: now(),
      });
      await repo.insert(task);
      return (await withProgress(userId, [task]))[0];
    },

    async update(
      userId: string,
      id: string,
      patch: UpdateTaskInput,
    ): Promise<TaskWithProgress> {
      const next = applyTaskUpdate(await load(userId, id), patch, now());
      await repo.save(next);
      return (await withProgress(userId, [next]))[0];
    },

    async remove(userId: string, id: string): Promise<void> {
      if (!(await repo.delete(userId, id))) {
        throw new DomainError("task_not_found", 404, "Tarea no encontrada");
      }
    },

    /** Título y materia de cada tarea del usuario (incluidas archivadas), para el jardín. */
    async describe(userId: string) {
      return new Map(
        (await repo.list(userId)).map((t) => [
          t.id,
          { title: t.title, subject: t.subject },
        ]),
      );
    },

    /** ¿La tarea existe y es de este usuario? Lo usa el servicio de sesiones. */
    async ownsTask(userId: string, id: string): Promise<boolean> {
      return (await repo.get(userId, id)) !== null;
    },
  };
}

export type TaskService = ReturnType<typeof createTaskService>;
