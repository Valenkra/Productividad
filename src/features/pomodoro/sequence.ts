import type { FocusMode, FocusSession } from "@/features/focus-tracking/types";
import type { PomodoroSettings } from "./settings";

/**
 * Siguiente fase. `completedFocusInCycle`: bloques de foco completados desde el último
 * descanso largo. `lastMode`: modo de la última fase terminada (null si no hay).
 */
export function nextMode(
  completedFocusInCycle: number,
  lastMode: FocusMode | null,
  s: PomodoroSettings,
): FocusMode {
  if (lastMode !== "focus") return "focus";
  return completedFocusInCycle >= s.longBreakInterval ? "long_break" : "short_break";
}

export function plannedSecondsFor(mode: FocusMode, s: PomodoroSettings): number {
  const minutes =
    mode === "focus"
      ? s.focusMinutes
      : mode === "short_break"
        ? s.shortBreakMinutes
        : s.longBreakMinutes;
  return minutes * 60;
}

export interface CycleProgress {
  cycleFocusCount: number;
  lastMode: FocusMode | null;
}

/** Cómo queda el ciclo Pomodoro cuando una fase termina (completada o abandonada). */
export function cycleAfter(
  session: Pick<FocusSession, "mode" | "status">,
  cycleFocusCount: number,
): CycleProgress {
  const resetsCycle = session.mode === "long_break";
  if (session.status === "completed" && session.mode === "focus") {
    return { cycleFocusCount: cycleFocusCount + 1, lastMode: "focus" };
  }
  // Descanso (completado o saltado): sigue el foco. Abandonar un foco no habilita descanso.
  return {
    cycleFocusCount: resetsCycle ? 0 : cycleFocusCount,
    lastMode: session.mode === "focus" ? null : session.mode,
  };
}
