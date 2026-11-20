"use client";

import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { focusRing } from "@/components/ui/styles";
import { TaskSheet } from "./task-sheet";
import { TaskSummary } from "./task-summary";
import type { TaskWithProgress } from "./types";

const TITLE = "¿En qué vas a trabajar?";

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

  // Mientras se crea una tarea, la hoja de edición reemplaza al selector (y maneja su Escape).
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
    <BottomSheet
      label={TITLE}
      onClose={onClose}
      overlayTestId="picker-overlay"
      className="max-h-[80vh] gap-3 pt-5"
    >
      <h2 className="text-2xl font-semibold">{TITLE}</h2>
      <ul className="flex flex-col gap-2">
        {tasks.map((t) => {
          const on = t.id === selectedId;
          return (
            <li key={t.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onSelect(t)}
                className={`${row} border-ink ${on ? "bg-peach" : "bg-white hover:bg-[#fdf3ee]"}`}
              >
                <TaskSummary task={t} />
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        aria-pressed={selectedId === null}
        onClick={() => onSelect(null)}
        className={`${row} border-dashed border-dashed-line ${selectedId === null ? "bg-peach" : "bg-transparent"} font-medium text-muted`}
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
    </BottomSheet>
  );
}
