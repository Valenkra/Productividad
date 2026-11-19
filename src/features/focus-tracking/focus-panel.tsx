"use client";

import { growthUnits, partialSeconds } from "@/features/garden/growth";
import { useFocusSession } from "./use-focus-session";
import type { FocusMode } from "./types";

const MODE_LABEL: Record<FocusMode, string> = {
  focus: "Concentración",
  short_break: "Descanso corto",
  long_break: "Descanso largo",
};

const btn =
  "min-h-12 rounded-xl px-5 text-base font-medium disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-strong";
const primary = `${btn} bg-leaf-strong text-white`;
const secondary = `${btn} border border-border bg-surface`;

function format(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FocusPanel() {
  const f = useFocusSession();

  if (f.loading) return <p role="status">Cargando sesión…</p>;
  if (!f.state) return <p role="alert">{f.error ?? "No se pudo cargar el estado."}</p>;

  const { session, plantTotalSeconds, nextMode } = f.state;
  const finished =
    session && (session.status === "completed" || session.status === "abandoned");
  const mode = f.open && session ? session.mode : nextMode;

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
    <section className="mx-auto flex max-w-md flex-col items-center gap-6 text-center">
      <h1 className="text-lg font-medium text-muted">{MODE_LABEL[mode]}</h1>

      {f.notice && (
        <p
          role="status"
          className="rounded-lg border border-border bg-surface p-3 text-sm"
        >
          {f.notice}
        </p>
      )}
      {!f.online && (
        <p role="alert" className="rounded-lg border border-soil bg-surface p-3 text-sm">
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
            className="text-7xl font-semibold tabular-nums"
            aria-label={`Quedan ${format(f.remainingSeconds)}`}
          >
            {format(f.remainingSeconds)}
          </p>
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
            <div role="status" className="rounded-xl border border-border bg-surface p-4">
              <p className="font-medium">
                {session.status === "completed" ? "¡Fase completada!" : "Fase terminada"}
              </p>
              <p className="text-sm text-muted">
                Tiempo acreditado: {format(session.creditedSeconds)} de{" "}
                {format(session.plannedSeconds)}
              </p>
            </div>
          )}
          <p className="text-7xl font-semibold tabular-nums text-muted">
            {format(f.state.nextPlannedSeconds)}
          </p>
          <button className={primary} disabled={!f.online} onClick={() => void f.start()}>
            {finished ? `Siguiente: ${MODE_LABEL[nextMode]}` : "Empezar a estudiar"}
          </button>
        </>
      )}

      <p className="text-sm text-muted">
        🌱 {growthUnits(plantTotalSeconds)} min de crecimiento (+
        {partialSeconds(plantTotalSeconds)}
        /60 s)
      </p>
      <p className="text-xs text-muted">
        El tiempo cuenta solo con la app abierta, visible y en primer plano. No es una
        medida de atención real.
      </p>
    </section>
  );
}
