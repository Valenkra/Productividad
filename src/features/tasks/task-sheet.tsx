"use client";

import { Trash2, X } from "lucide-react";
import { useState } from "react";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { Stepper } from "@/components/ui/stepper";
import {
  btnPrimary,
  btnRound,
  btnSecondary,
  chip,
  chipOff,
  chipOn,
  field,
} from "@/components/ui/styles";
import { createTask, deleteTask, updateTask } from "./api";
import { dueAtFor, dueChipOf, type DueChip } from "./due";
import { SUBJECTS, type SubjectId } from "./subjects";
import type { TaskPriority, TaskWithProgress } from "./types";

const PRIORITIES: { id: TaskPriority; label: string; dot: string }[] = [
  { id: "low", label: "Baja", dot: "bg-prio-low" },
  { id: "medium", label: "Media", dot: "bg-prio-medium" },
  { id: "high", label: "Alta", dot: "bg-prio-high" },
];

const DUE_CHIPS: { id: DueChip; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "tomorrow", label: "Mañana" },
  { id: "week", label: "Esta semana" },
  { id: "none", label: "Sin fecha" },
];

export function TaskSheet({
  task,
  focusMinutes,
  now,
  onClose,
  onSaved,
  onDeleted,
}: {
  /** null = tarea nueva. */
  task: TaskWithProgress | null;
  focusMinutes: number;
  /** Epoch ms de "ahora", fijado por el padre (nunca `Date.now()` en el render). */
  now: number;
  onClose: () => void;
  onSaved: (task: TaskWithProgress) => void;
  onDeleted: (id: string) => void;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [subject, setSubject] = useState<SubjectId | null>(task?.subject ?? null);
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "medium");
  const [pomodoros, setPomodoros] = useState(task?.estimatedPomodoros ?? 2);
  const [dueAt, setDueAt] = useState<number | null>(task?.dueAt ?? null);
  const [problem, setProblem] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activeChip = dueChipOf(dueAt, now);
  const empty = problem === "Ponle un nombre a la tarea";
  const label = task ? "Editar tarea" : "Nueva tarea";

  async function save() {
    const trimmed = title.trim();
    if (!trimmed) {
      setProblem("Ponle un nombre a la tarea");
      return;
    }
    setSaving(true);
    setProblem(null);
    try {
      const fields = {
        title: trimmed,
        subject,
        priority,
        estimatedPomodoros: pomodoros,
        dueAt,
      };
      onSaved(task ? await updateTask(task.id, fields) : await createTask(fields));
    } catch {
      setProblem("No se pudo guardar. Prueba de nuevo.");
      setSaving(false);
    }
  }

  async function remove() {
    if (!task || !window.confirm("¿Eliminar esta tarea?")) return;
    setSaving(true);
    try {
      await deleteTask(task.id);
      onDeleted(task.id);
    } catch {
      setProblem("No se pudo eliminar. Prueba de nuevo.");
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      label={label}
      onClose={onClose}
      overlayTestId="sheet-overlay"
      className="max-h-[92vh] gap-4 pt-3.5"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{label}</h2>
        <button type="button" aria-label="Cerrar" className={btnRound} onClick={onClose}>
          <X size={20} strokeWidth={2.4} aria-hidden="true" />
        </button>
      </div>

      <div>
        <input
          aria-label="Título"
          aria-invalid={empty}
          placeholder="¿Qué tienes que estudiar?"
          value={title}
          maxLength={200}
          onChange={(e) => {
            setTitle(e.target.value);
            if (empty) setProblem(null);
          }}
          className={`${field} ${empty ? "!border-danger" : ""}`}
        />
        {problem && (
          <p role="alert" className="mt-1.5 text-[13px] font-medium text-danger">
            {problem}
          </p>
        )}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-muted">Materia</legend>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => {
            const on = subject === s.id;
            return (
              <button
                key={s.id}
                type="button"
                aria-pressed={on}
                onClick={() => setSubject(on ? null : s.id)}
                className={`${chip} ${on ? `${chipOn} ${s.bg}` : chipOff}`}
              >
                {s.name}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <p className="mb-2 text-sm font-semibold text-muted">Prioridad</p>
        <div
          role="radiogroup"
          aria-label="Prioridad"
          className="flex gap-1 rounded-2xl bg-segment p-1"
        >
          {PRIORITIES.map((p) => {
            const on = priority === p.id;
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPriority(p.id)}
                className={`flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl border-[1.5px] text-sm font-semibold transition-colors ${
                  on ? "border-ink bg-white" : "border-transparent"
                }`}
              >
                <span className={`size-2.5 rounded-full ${p.dot}`} aria-hidden="true" />
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <div role="group" aria-label="Pomodoros">
        <p className="mb-2 text-sm font-semibold text-muted">Pomodoros</p>
        <div className="flex items-center gap-4">
          <Stepper
            size="lg"
            value={pomodoros}
            onChange={setPomodoros}
            min={1}
            max={12}
            decreaseLabel="Menos pomodoros"
            increaseLabel="Más pomodoros"
          />
          <span className="text-sm text-muted">{pomodoros * focusMinutes} min</span>
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-muted">Para cuándo</legend>
        <div className="flex flex-wrap gap-2">
          {DUE_CHIPS.map((c) => {
            const on = activeChip === c.id;
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={on}
                onClick={() => setDueAt(dueAtFor(c.id, now))}
                className={`${chip} ${on ? `${chipOn} bg-lilac` : chipOff}`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="flex gap-3">
        {task && (
          <button
            type="button"
            aria-label="Eliminar tarea"
            className={`${btnSecondary} w-[62px] !px-0 text-danger`}
            disabled={saving}
            onClick={() => void remove()}
          >
            <Trash2 size={22} strokeWidth={2.2} aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          className={`${btnPrimary} flex-1`}
          disabled={saving}
          onClick={() => void save()}
        >
          Guardar
        </button>
      </div>
    </BottomSheet>
  );
}
