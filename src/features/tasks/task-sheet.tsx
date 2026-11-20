"use client";

import { Minus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  btnPrimary,
  btnRound,
  btnSecondary,
  chip,
  chipOff,
  chipOn,
  field,
} from "@/components/ui/styles";
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const activeChip = dueChipOf(dueAt, now);
  const empty = problem === "Ponle un nombre a la tarea";
  const label = task ? "Editar tarea" : "Nueva tarea";

  async function send(url: string, method: string, body?: unknown) {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Error ${res.status}`);
    return res;
  }

  async function save() {
    const trimmed = title.trim();
    if (!trimmed) {
      setProblem("Ponle un nombre a la tarea");
      return;
    }
    setSaving(true);
    setProblem(null);
    try {
      const res = await send(
        task ? `/api/tasks/${task.id}` : "/api/tasks",
        task ? "PATCH" : "POST",
        {
          title: trimmed,
          subject,
          priority,
          estimatedPomodoros: pomodoros,
          dueAt,
        },
      );
      const body = (await res.json()) as { task: TaskWithProgress };
      onSaved(body.task);
    } catch {
      setProblem("No se pudo guardar. Prueba de nuevo.");
      setSaving(false);
    }
  }

  async function remove() {
    if (!task || !window.confirm("¿Eliminar esta tarea?")) return;
    setSaving(true);
    try {
      await send(`/api/tasks/${task.id}`, "DELETE");
      onDeleted(task.id);
    } catch {
      setProblem("No se pudo eliminar. Prueba de nuevo.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center">
      <div
        data-testid="sheet-overlay"
        className="absolute inset-0 bg-[rgba(74,61,85,0.45)]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="app-theme relative flex max-h-[92vh] w-full max-w-md flex-col gap-4 overflow-y-auto rounded-t-[32px] px-5 pb-[34px] pt-3.5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold">{label}</h2>
          <button
            type="button"
            aria-label="Cerrar"
            className={btnRound}
            onClick={onClose}
          >
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
            className="flex gap-1 rounded-2xl bg-[#fbe3d4] p-1"
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
            <button
              type="button"
              aria-label="Menos pomodoros"
              className={btnRound}
              disabled={pomodoros <= 1}
              onClick={() => setPomodoros((n) => Math.max(1, n - 1))}
            >
              <Minus size={18} strokeWidth={2.6} aria-hidden="true" />
            </button>
            <span className="min-w-8 text-center text-2xl font-semibold tabular-nums">
              {pomodoros}
            </span>
            <button
              type="button"
              aria-label="Más pomodoros"
              className={btnRound}
              disabled={pomodoros >= 12}
              onClick={() => setPomodoros((n) => Math.min(12, n + 1))}
            >
              <Plus size={18} strokeWidth={2.6} aria-hidden="true" />
            </button>
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
      </div>
    </div>
  );
}
