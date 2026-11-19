import type { Task } from "@/features/tasks/types";

export interface TaskRepository {
  list(userId: string): Promise<Task[]>;
  get(userId: string, id: string): Promise<Task | null>;
  insert(task: Task): Promise<void>;
  save(task: Task): Promise<void>;
  delete(userId: string, id: string): Promise<boolean>;
  /** Mayor `position` del usuario (0 si no tiene tareas). */
  maxPosition(userId: string): Promise<number>;
}
