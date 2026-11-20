import { subjectOf } from "./subjects";
import type { TaskWithProgress } from "./types";

/** «Materia · 2 de 4 pomodoros» (sin materia, solo el avance). */
export function taskMeta(
  task: Pick<TaskWithProgress, "subject" | "completedPomodoros" | "estimatedPomodoros">,
): string {
  return [
    subjectOf(task.subject)?.name,
    `${task.completedPomodoros} de ${task.estimatedPomodoros} pomodoros`,
  ]
    .filter(Boolean)
    .join(" · ");
}
