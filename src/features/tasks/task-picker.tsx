"use client";

import { useEffect, useState } from "react";
import { focusRing } from "@/components/ui/styles";
import { subjectOf } from "./subjects";
import { TaskSheet } from "./task-sheet";
import type { TaskWithProgress } from "./types";

/** Hoja inferior «¿En qué vas a trabajar?» para elegir la tarea del pomodoro. */
export function TaskPicker({
  tasks,
  selectedId,
  focusMinutes,
  now,
  onSelect,
  onClose,
}: {
  /** Solo pendientes. */
  tasks: TaskWithProgress[];
  selectedId: string | null;
  focusMinutes: number;
  now: number;
  /** null = sesión libre. Una tarea recién creada llega completa. */
  onSelect: (task: TaskWithProgress | null) => void;
  onClose: () => void;
}) {
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (creating) return; // la hoja de edición maneja su propio Escape
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [creating, onClose]);

  if (creating) {
    return (
      <TaskSheet
        task={null}
        focusMinutes={focusMinutes}
        now={now}
        onClose={() => setCreating(false)}
        onSaved={(task) => onSelect(task)}
        onDeleted={() => setCreating(false)}
      />
    );
  }

  const row = `flex min-h-14 w-full items-center gap-3 rounded-[20px] border-[1.5px] px-4 py-2 text-left transition-colors ${focusRing}`;

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <div
        data-testid="picker-overlay"
        className="absolute inset-0 bg-[rgba(74,61,85,0.45)]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="¿En qué vas a trabajar?"
        className="app-theme relative flex max-h-[80vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-t-[32px] px-5 pb-[34px] pt-5"
      >
        <h2 className="text-2xl font-semibold">¿En qué vas a trabajar?</h2>
        <ul className="flex flex-col gap-2">
          {tasks.map((t) => {
            const on = t.id === selectedId;
            const subject = subjectOf(t.subject);
            return (
              <li key={t.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onSelect(t)}
                  className={`${row} border-ink ${on ? "bg-[#f7e3da]" : "bg-white hover:bg-[#fdf3ee]"}`}
                >
                  <span
                    aria-hidden="true"
                    className={`size-3.5 shrink-0 rounded-full border-[1.5px] border-ink ${subject?.bg ?? "bg-white"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{t.title}</span>
                    <span className="block text-[13px] text-muted">
                      {[
                        subject?.name,
                        `${t.completedPomodoros} de ${t.estimatedPomodoros} pomodoros`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          aria-pressed={selectedId === null}
          onClick={() => onSelect(null)}
          className={`${row} border-dashed border-[#c9b8d6] ${selectedId === null ? "bg-[#f7e3da]" : "bg-transparent"} font-medium text-muted`}
        >
          Sesión libre, sin tarea
        </button>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={`${row} border-transparent bg-lilac font-semibold`}
        >
          + Nueva tarea
        </button>
      </div>
    </div>
  );
}
