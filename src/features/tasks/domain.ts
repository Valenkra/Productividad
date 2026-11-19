import type { CreateTaskInput, ListQuery, TaskSort, UpdateTaskInput } from "./schema";
import type { Task, TaskPriority } from "./types";

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
const byDue = (a: Task, b: Task) =>
  (a.dueAt ?? Number.POSITIVE_INFINITY) - (b.dueAt ?? Number.POSITIVE_INFINITY);
const byPriority = (a: Task, b: Task) =>
  PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];

export function createTask(input: {
  id: string;
  userId: string;
  input: CreateTaskInput;
  position: number;
  now: number;
}): Task {
  return {
    id: input.id,
    userId: input.userId,
    ...input.input,
    status: "todo",
    completedAt: null,
    position: input.position,
    createdAt: input.now,
    updatedAt: input.now,
  };
}

export function applyTaskUpdate(task: Task, patch: UpdateTaskInput, now: number): Task {
  const next: Task = { ...task, ...patch, updatedAt: now };
  if (patch.status === "done") {
    next.completedAt = task.completedAt ?? now;
  } else if (patch.status === "todo" || patch.status === "in_progress") {
    next.completedAt = null;
  }
  return next;
}

export function filterTasks(
  tasks: Task[],
  query: Pick<ListQuery, "status" | "priority">,
): Task[] {
  return tasks.filter((t) => {
    const statusOk =
      query.status === undefined
        ? t.status !== "archived"
        : query.status === "all" || t.status === query.status;
    return statusOk && (!query.priority || t.priority === query.priority);
  });
}

export function sortTasks(tasks: Task[], sort: TaskSort): Task[] {
  const copy = [...tasks];
  switch (sort) {
    case "manual":
      return copy.sort((a, b) => a.position - b.position);
    case "due":
      return copy.sort(byDue);
    case "priority":
      return copy.sort((a, b) => byPriority(a, b) || byDue(a, b));
    case "created":
      return copy.sort((a, b) => b.createdAt - a.createdAt);
  }
}

/** Próxima tarea sugerida: en curso primero, luego prioridad, fecha límite y posición. */
export function nextTask(tasks: Task[]): Task | null {
  const open = tasks.filter((t) => t.status === "todo" || t.status === "in_progress");
  const rank = (t: Task) => (t.status === "in_progress" ? 0 : 1);
  open.sort(
    (a, b) =>
      rank(a) - rank(b) || byPriority(a, b) || byDue(a, b) || a.position - b.position,
  );
  return open[0] ?? null;
}

/** Vencida: abierta, con fecha límite y ya pasada (justo en la fecha aún no cuenta). */
export function isOverdue(task: Task, now: number): boolean {
  const open = task.status === "todo" || task.status === "in_progress";
  return open && task.dueAt !== null && now > task.dueAt;
}
