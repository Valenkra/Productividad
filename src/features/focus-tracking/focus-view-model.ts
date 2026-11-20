import {
  MAX_STAGE,
  nextStageIn,
  sessionStage,
  STAGE_NAMES,
} from "@/features/garden/growth";
import { formatClock } from "@/lib/time/format";
import { BREAK_TIP, MODE_LABEL } from "./copy";
import type { FocusMode, FocusSession } from "./types";

export interface FocusViewInput {
  /** Sesión activa o pausada (null si no hay ninguna abierta). */
  open: FocusSession | null;
  nextMode: FocusMode;
  nextPlannedSeconds: number;
  cycleFocusCount: number;
  displayedSeconds: number;
  remainingSeconds: number;
  counting: boolean;
  online: boolean;
  settings: { longBreakInterval: number; displayName: string } | null;
}

/** Textos y estado visual de la pantalla de Foco. Puro: sin reloj ni red. */
export function focusViewModel(input: FocusViewInput) {
  const { open, counting, online, settings } = input;
  const mode: FocusMode = open ? open.mode : input.nextMode;
  const isBreak = mode !== "focus";
  const planned = open ? open.plannedSeconds : input.nextPlannedSeconds;
  const elapsed = open ? input.displayedSeconds : 0;
  const remaining = open ? input.remainingSeconds : planned;
  const stage = isBreak ? MAX_STAGE : sessionStage(elapsed, planned, false);
  const running = open?.status === "active";
  const paused = open?.status === "paused";

  const cycleSize = settings?.longBreakInterval ?? 4;
  const done = input.cycleFocusCount;
  const cycleNow = Math.max(1, Math.min(cycleSize, isBreak ? done : done + 1));

  const name = settings?.displayName.trim() ?? "";
  const greeting = isBreak
    ? "¡Floreció! Bien hecho"
    : running
      ? "Concentración a tope"
      : name
        ? `¡A por ello, ${name}!`
        : "¡A por ello!";

  let hint: string;
  if (isBreak) {
    hint = paused
      ? "En pausa"
      : running
        ? "Disfruta del descanso"
        : "Pulsa empezar para descansar";
  } else if (!open) {
    hint = "Pulsa empezar para plantar tu semilla";
  } else if (paused) {
    hint = "En pausa — tu planta te espera";
  } else {
    const wait = nextStageIn(elapsed, planned);
    hint =
      wait === null
        ? "Florece al terminar"
        : `${STAGE_NAMES[stage + 1]} en ${formatClock(wait)}`;
  }

  const stateText = !open
    ? "Sin sesión"
    : paused
      ? "Pausada: no se está contando tiempo"
      : counting
        ? "Contando tiempo"
        : !online
          ? "Sin conexión: no se cuenta tiempo"
          : "Esperando que vuelvas a la app";

  return {
    mode,
    title: MODE_LABEL[mode],
    isBreak,
    breakTip: mode === "focus" ? null : BREAK_TIP[mode],
    remaining,
    stage,
    running,
    paused,
    cycleNow,
    cycleSize,
    greeting,
    hint,
    stateText,
  };
}
