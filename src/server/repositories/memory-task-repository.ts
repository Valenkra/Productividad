import type { Task } from "@/features/tasks/types";
import type { TaskRepository } from "./task-repository";

/** Implementación local en memoria. Temporal hasta Supabase. */
export class MemoryTaskRepository implements TaskRepository {
  private tasks = new Map<string, Task>();

  async list(userId: string) {
    return [...this.tasks.values()].filter((t) => t.userId === userId);
  }

  async get(userId: string, id: string) {
    const t = this.tasks.get(id);
    return t && t.userId === userId ? t : null;
  }

  async insert(task: Task) {
    this.tasks.set(task.id, task);
  }

  async save(task: Task) {
    this.tasks.set(task.id, task);
  }

  async delete(userId: string, id: string) {
    const t = this.tasks.get(id);
    if (!t || t.userId !== userId) return false;
    return this.tasks.delete(id);
  }

  async maxPosition(userId: string) {
    let max = 0;
    for (const t of this.tasks.values())
      if (t.userId === userId) max = Math.max(max, t.position);
    return max;
  }
}
