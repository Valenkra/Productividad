"use client";

import { Check, Play, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { card, focusRing } from "@/components/ui/styles";
import type { UserSettings } from "@/features/settings/schema";
import { useApi } from "@/lib/utils/use-api";
import { countDueToday, dueLabel } from "./due";
import { subjectOf } from "./subjects";
import { TaskSheet } from "./task-sheet";
import type { TaskPriority, TaskWithProgress } from "./types";

const PRIORITY: Record<TaskPriority, { label: string; dot: string }> = {
  low: { label: "baja", dot: "bg-prio-low" },
  medium: { label: "media", dot: "bg-prio-medium" },
  high: { label: "alta", dot: "bg-prio-high" },
};

const isOpen = (t: TaskWithProgress) => t.status === "todo" || t.status === "in_progress";

type Sheet = { task: TaskWithProgress | null } | null;

export function TasksView() {
  const [tasks, setTasks] = useState<TaskWithProgress[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [sheet, setSheet] = useState<Sheet>(null);
  // "Ahora" se fija al recibir los datos (en el cliente): Date.now() en el render rompe el prerender.
  const [now, setNow] = useState(0);
  const settings = useApi<UserSettings>("/api/settings");
  const focusMinutes = settings.data?.focusMinutes ?? 25;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/tasks?status=all", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as { tasks: TaskWithProgress[] };
      })
      .then((body) => {
        if (cancelled) return;
        setTasks(body.tasks.filter((t) => t.status !== "archived"));
        setNow(Date.now());
        setLoadError(false);
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const closeSheet = useCallback(() => setSheet(null), []);

  async function toggle(task: TaskWithProgress) {
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: isOpen(task) ? "done" : "todo" }),
      });
      if (!res.ok) throw new Error();
      setActionError(null);
      reload();
    } catch {
      setActionError("No se pudo guardar el cambio. Prueba de nuevo.");
    }
  }

  if (tasks === null) {
    return loadError ? (
      <p role="alert">No se pudieron cargar las tareas.</p>
    ) : (
      <p role="status">Cargando tareas…</p>
    );
  }

  const open = tasks.filter(isOpen);
  const finished = tasks.filter((t) => t.status === "done");

  return (
    <section className="flex flex-col gap-4">
      <header>
        <p className="text-sm font-medium text-muted">
          {`${countDueToday(tasks, now)} para hoy · ${open.length} pendientes`}
        </p>
        <h1 className="text-[30px] font-semibold leading-tight">Tareas</h1>
      </header>

      {actionError && (
        <p role="alert" className="text-sm font-medium text-danger">
          {actionError}
        </p>
      )}

      {open.length === 0 ? (
        <p className="rounded-[22px] bg-mint p-5 font-medium">
          ¡Todo hecho! Añade algo nuevo o date un respiro.
        </p>
      ) : (
        <ul aria-label="Tareas pendientes" className="flex flex-col gap-3">
          {open.map((t) => {
            const subject = subjectOf(t.subject);
            const filled = Math.min(t.completedPomodoros, t.estimatedPomodoros);
            return (
              <li
                key={t.id}
                data-title={t.title}
                className={`${card} flex items-center gap-3 p-3`}
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={false}
                  aria-label={`Completar ${t.title}`}
                  onClick={() => void toggle(t)}
                  className={`size-[30px] shrink-0 rounded-[10px] border-[1.5px] border-ink bg-white transition-colors hover:bg-mint ${focusRing}`}
                />
                <button
                  type="button"
                  aria-label={`Editar ${t.title}`}
                  onClick={() => setSheet({ task: t })}
                  className={`min-w-0 flex-1 text-left ${focusRing}`}
                >
                  <span className="block truncate text-base font-medium">{t.title}</span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                    {subject && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${subject.bg}`}
                      >
                        {subject.name}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-muted">
                      <span
                        aria-hidden="true"
                        className={`size-2 rounded-full ${PRIORITY[t.priority].dot}`}
                      />
                      <span className="sr-only">
                        {`Prioridad ${PRIORITY[t.priority].label}`}
                      </span>
                      <span>{dueLabel(t.dueAt, now)}</span>
                    </span>
                    <span className="flex gap-1" aria-hidden="true">
                      {Array.from({ length: t.estimatedPomodoros }, (_, i) => (
                        <span
                          key={i}
                          className={`size-2.5 rounded-full border-[1.5px] border-accent ${
                            i < filled ? "bg-accent" : ""
                          }`}
                        />
                      ))}
                    </span>
                    <span className="sr-only">
                      {`${t.completedPomodoros} de ${t.estimatedPomodoros} pomodoros`}
                    </span>
                  </span>
                </button>
                <Link
                  href={`/focus?task=${t.id}`}
                  aria-label={`Estudiar ${t.title}`}
                  className={`grid size-11 shrink-0 place-items-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover ${focusRing}`}
                >
                  <Play size={20} fill="currentColor" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {finished.length > 0 && (
        <>
          <h2 className="mt-2 text-base font-semibold text-muted">Hechas</h2>
          <ul aria-label="Tareas hechas" className="flex flex-col gap-2">
            {finished.map((t) => (
              <li
                key={t.id}
                data-title={t.title}
                className="flex items-center gap-3 rounded-[22px] bg-[#fbe9db] p-3"
              >
                <button
                  type="button"
                  role="checkbox"
                  aria-checked
                  aria-label={`Reabrir ${t.title}`}
                  onClick={() => void toggle(t)}
                  className={`grid size-[30px] shrink-0 place-items-center rounded-[10px] border-[1.5px] border-ink bg-[#7fcf9f] ${focusRing}`}
                >
                  <Check size={18} strokeWidth={3} aria-hidden="true" />
                </button>
                <span className="min-w-0 flex-1 truncate text-base font-medium text-[#8a7598] line-through">
                  {t.title}
                </span>
                <span className="text-sm text-[#8a7598]">
                  {`${t.completedPomodoros}/${t.estimatedPomodoros}`}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-[104px] z-10 mx-auto max-w-md">
        <button
          type="button"
          aria-label="Añadir tarea"
          onClick={() => setSheet({ task: null })}
          className={`pointer-events-auto ml-auto mr-5 grid size-16 place-items-center rounded-[22px] border-[1.5px] border-ink bg-accent text-white shadow-[0_4px_0_var(--ink)] transition-[transform,box-shadow] active:translate-y-1 active:shadow-[0_0_0_var(--ink)] ${focusRing}`}
        >
          <Plus size={30} strokeWidth={2.6} aria-hidden="true" />
        </button>
      </div>

      {sheet && (
        <TaskSheet
          task={sheet.task}
          focusMinutes={focusMinutes}
          now={now}
          onClose={closeSheet}
          onSaved={() => {
            setSheet(null);
            reload();
          }}
          onDeleted={() => {
            setSheet(null);
            reload();
          }}
        />
      )}
    </section>
  );
}
