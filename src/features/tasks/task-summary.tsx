import { subjectOf } from "./subjects";
import { taskMeta } from "./task-meta";
import type { TaskWithProgress } from "./types";

/** Punto de materia + título + «Materia · n de m pomodoros» (o «Sesión libre»). */
export function TaskSummary({ task }: { task: TaskWithProgress | undefined }) {
  if (!task) {
    return (
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden="true"
          className="size-3.5 shrink-0 rounded-full border-[1.5px] border-dashed border-ink"
        />
        <span className="truncate font-medium">Sesión libre, sin tarea</span>
      </span>
    );
  }
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <span
        aria-hidden="true"
        className={`size-3.5 shrink-0 rounded-full border-[1.5px] border-ink ${subjectOf(task.subject)?.bg ?? "bg-white"}`}
      />
      <span className="min-w-0">
        <span className="block truncate text-base font-medium">{task.title}</span>
        <span className="block text-[13px] text-muted">{taskMeta(task)}</span>
      </span>
    </span>
  );
}
