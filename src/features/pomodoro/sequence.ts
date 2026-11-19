import type { FocusMode } from "@/features/focus-tracking/types";
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
