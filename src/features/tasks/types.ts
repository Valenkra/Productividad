import type { SubjectId } from "./subjects";

export type TaskStatus = "todo" | "in_progress" | "done" | "archived";
export type TaskPriority = "low" | "medium" | "high";

/** Instantes en epoch ms. */
export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  subject: SubjectId | null;
  /** Pomodoros que se calcula que llevará (1–12). */
  estimatedPomodoros: number;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: number | null;
  completedAt: number | null;
  position: number;
  createdAt: number;
  updatedAt: number;
}

/** Lo que devuelve la API: la tarea más sus pomodoros completados (derivados de las sesiones). */
export interface TaskWithProgress extends Task {
  completedPomodoros: number;
}
