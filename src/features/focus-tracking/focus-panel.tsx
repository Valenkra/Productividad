"use client";

import { useState } from "react";
import { useApi } from "@/lib/utils/use-api";
import type { Task } from "@/features/tasks/types";
import { growthInfo } from "@/features/garden/growth";
import { PlantIllustration } from "@/features/garden/plant-illustration";
import { useFocusSession } from "./use-focus-session";
import type { FocusMode } from "./types";

const MODE_LABEL: Record<FocusMode, string> = {
  focus: "Concentración",
  short_break: "Descanso corto",
  long_break: "Descanso largo",
};

const btn =
  "min-h-12 rounded-full px-6 text-base font-medium transition-colors disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-strong";
const primary = `${btn} bg-leaf-strong text-white shadow-[0_12px_30px_-12px_rgba(58,95,55,0.8)] hover:bg-leaf`;
const secondary = `${btn} border border-border bg-surface hover:bg-background`;
const card = "rounded-3xl border border-border bg-surface p-4";

function format(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusPanel() {
  const f = useFocusSession();
  const tasksApi = useApi<{ tasks: Task[] }>("/api/tasks?sort=priority");
  const [taskId, setTaskId] = useState("");
  // Si las tareas no cargan, el foco sigue funcionando sin selector.
  const allTasks = tasksApi.data?.tasks ?? [];
  const openTasks = allTasks.filter(
    (t) => t.status === "todo" || t.status === "in_progress",
  );

  if (f.loading) return <p role="status">Cargando sesión…</p>;
  if (!f.state) return <p role="alert">{f.error ?? "No se pudo cargar el estado."}</p>;

  const { session, plantTotalSeconds, nextMode } = f.state;
  const growth = growthInfo(plantTotalSeconds);
  const finished =
    session && (session.status === "completed" || session.status === "abandoned");
  const mode = f.open && session ? session.mode : nextMode;
  const currentTask = session?.taskId
    ? allTasks.find((t) => t.id === session.taskId)
    : undefined;

  const confirmThen = (message: string, action: () => void) => {
    if (window.confirm(message)) action();
  };

  const stateText = !session
    ? "Sin sesión"
    : session.status === "paused"
      ? "Pausada: no se está contando tiempo"
      : f.counting
        ? "Contando tiempo"
        : !f.online
          ? "Sin conexión: no se cuenta tiempo"
          : "Esperando que vuelvas a la app";

  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
      <h1 className="text-xs font-semibold uppercase tracking-[0.2em] text-leaf-strong">
        {MODE_LABEL[mode]}
      </h1>

      <div className="relative grid h-64 w-64 place-items-center sm:h-72 sm:w-72">
        <div className="ground-glow absolute inset-0 rounded-full" aria-hidden="true" />
        <div className="relative h-[88%] w-[88%] [&_svg]:h-full [&_svg]:w-full">
          <PlantIllustration
            key={`${growth.stage}-${growth.units}`}
            stage={growth.stage}
            growing={Boolean(f.counting && session?.mode === "focus")}
            fit
          />
        </div>
      </div>
      <p className="-mt-2 text-sm text-muted">
        {growth.name} · {growth.units} min (+{growth.partialSeconds}/60 s)
      </p>

      {f.notice && (
        <p
          role="status"
          className="rounded-2xl border border-border bg-surface p-3 text-sm"
        >
          {f.notice}
        </p>
      )}
      {!f.online && (
        <p role="alert" className="rounded-2xl border border-soil bg-surface p-3 text-sm">
          Estás sin conexión. El tiempo que no se pueda confirmar no se acredita.
        </p>
      )}
      {f.error && f.online && (
        <p role="alert" className="text-sm text-soil">
          {f.error}
        </p>
      )}

      {f.open && session ? (
        <>
          <p
            className="font-display text-7xl font-semibold tabular-nums tracking-tight"
            aria-label={`Quedan ${format(f.remainingSeconds)}`}
          >
            {format(f.remainingSeconds)}
          </p>
          {currentTask && <p className="text-sm">Tarea: {currentTask.title}</p>}
          <p aria-live="polite" className="text-sm text-muted">
            {f.counting ? "● " : "○ "}
            {stateText}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {session.status === "active" ? (
              <button className={secondary} onClick={() => void f.pause()}>
                Pausar
              </button>
            ) : (
              <button
                className={primary}
                disabled={!f.attentive || !f.online}
                onClick={() => void f.resume()}
              >
                Reanudar
              </button>
            )}
            <button
              className={secondary}
              onClick={() =>
                confirmThen(
                  "¿Saltar esta fase? Se conserva el tiempo ya acreditado.",
                  () => void f.finish("abandoned"),
                )
              }
            >
              Saltar
            </button>
            <button
              className={secondary}
              onClick={() =>
                confirmThen(
                  "¿Terminar la sesión ahora?",
                  () => void f.finish("abandoned"),
                )
              }
            >
              Terminar
            </button>
          </div>
        </>
      ) : (
        <>
          {finished && session && (
            <div role="status" className={card}>
              <p className="font-medium">
                {session.status === "completed" ? "¡Fase completada!" : "Fase terminada"}
              </p>
              <p className="text-sm text-muted">
                Tiempo acreditado: {format(session.creditedSeconds)} de{" "}
                {format(session.plannedSeconds)}
              </p>
              {session.mode === "focus" && (
                <p className="text-sm text-leaf-strong">
                  +{Math.floor(session.creditedSeconds / 60)} min de crecimiento para tu
                  planta
                </p>
              )}
            </div>
          )}
          <p className="font-display text-7xl font-semibold tabular-nums tracking-tight text-muted">
            {format(f.state.nextPlannedSeconds)}
          </p>
          {nextMode === "focus" && openTasks.length > 0 && (
            <label className="flex w-full flex-col gap-1 text-left text-sm">
              Tarea (opcional)
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="min-h-12 rounded-2xl border border-border bg-surface px-4 text-base"
              >
                <option value="">Sin tarea</option>
                {openTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            className={primary}
            disabled={!f.online}
            onClick={() => void f.start(nextMode === "focus" ? taskId || null : null)}
          >
            {finished ? `Siguiente: ${MODE_LABEL[nextMode]}` : "Empezar a estudiar"}
          </button>
        </>
      )}

      <p className="text-xs text-muted">
        El tiempo cuenta solo con la app abierta, visible y en primer plano. No es una
        medida de atención real.
      </p>
    </section>
  );
}
