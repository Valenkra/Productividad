"use client";

import Link from "next/link";
import { PlantIllustration } from "@/features/garden/plant-illustration";
import { useMiniFocus } from "./use-mini-focus";

const RING_R = 118;
const RING_LENGTH = 2 * Math.PI * RING_R;

const pill =
  "inline-flex min-h-12 items-center justify-center rounded-full px-6 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf-strong";
const primary = `${pill} bg-leaf-strong text-white hover:bg-leaf`;
const ghost = `${pill} border border-border bg-surface text-foreground hover:bg-background`;

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function MiniFocusDemo() {
  const demo = useMiniFocus();
  const { status, autoPaused } = demo.state;

  const message =
    status === "done"
      ? "¡Listo! Tu planta floreció. Con una cuenta, tu progreso se guarda y la planta sigue creciendo."
      : status === "paused" && autoPaused
        ? "Pausamos el mini-foco porque saliste de la pestaña. En la app real pasa igual: el tiempo solo cuenta con la app visible."
        : status === "paused"
          ? "En pausa."
          : status === "running"
            ? "Enfocate: tu planta crece mientras sigas acá."
            : "";

  return (
    <section
      aria-labelledby="demo-title"
      className="relative mx-auto w-full max-w-sm rounded-[2rem] border border-border bg-surface/90 p-6 shadow-[0_24px_60px_-24px_rgba(58,95,55,0.45)] backdrop-blur"
    >
      <h2
        id="demo-title"
        className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted"
      >
        Probá un mini Pomodoro
      </h2>

      <div className="relative mx-auto mt-3 grid h-56 w-56 place-items-center sm:mt-4 sm:h-72 sm:w-72">
        <svg
          viewBox="0 0 260 260"
          className="absolute inset-0 -rotate-90"
          aria-hidden="true"
        >
          <circle
            cx="130"
            cy="130"
            r={RING_R}
            fill="none"
            strokeWidth="8"
            className="stroke-border"
          />
          <circle
            cx="130"
            cy="130"
            r={RING_R}
            fill="none"
            strokeWidth="8"
            strokeLinecap="round"
            className="stroke-leaf transition-[stroke-dashoffset] duration-300"
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - demo.progress)}
          />
        </svg>
        <div className="ground-glow absolute inset-6 rounded-full" aria-hidden="true" />
        {/* La planta ocupa casi todo el anillo; el SVG escala con su contenedor. */}
        <div className="relative h-[82%] w-[82%] [&_svg]:h-full [&_svg]:w-full">
          <PlantIllustration
            key={demo.stage}
            stage={demo.stage}
            growing={status === "running"}
          />
        </div>
      </div>

      <p
        role="timer"
        aria-label="Tiempo restante del mini-foco"
        className="mt-1 text-center font-display text-5xl font-semibold tabular-nums tracking-tight sm:mt-2 sm:text-6xl"
      >
        {mmss(demo.remainingSeconds)}
      </p>

      <p
        role="status"
        className="mt-1 min-h-10 text-center text-sm text-muted sm:mt-2 sm:min-h-12"
      >
        {message}
      </p>

      <div className="mt-3 flex flex-wrap justify-center gap-3">
        {status === "idle" && (
          <button className={primary} onClick={demo.start}>
            Empezar mini-foco
          </button>
        )}
        {status === "running" && (
          <button className={ghost} onClick={demo.pause}>
            Pausar
          </button>
        )}
        {status === "paused" && (
          <button className={primary} onClick={demo.start}>
            Reanudar
          </button>
        )}
        {(status === "running" || status === "paused") && (
          <button className={ghost} onClick={demo.reset}>
            Reiniciar
          </button>
        )}
        {status === "done" && (
          <>
            <Link href="/login" className={primary}>
              Crear mi cuenta y guardar mi planta
            </Link>
            <button className={ghost} onClick={demo.start}>
              Probar de nuevo
            </button>
          </>
        )}
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        Es una demo acelerada de 1 minuto y no se guarda nada. En la app real, 25 minutos
        de foco son un bloque Pomodoro.
      </p>
    </section>
  );
}
