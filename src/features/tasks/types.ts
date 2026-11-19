export type TaskStatus = "todo" | "in_progress" | "done" | "archived";
export type TaskPriority = "low" | "medium" | "high";

/** Instantes en epoch ms. */
export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueAt: number | null;
  completedAt: number | null;
  position: number;
  createdAt: number;
  updatedAt: number;
}
