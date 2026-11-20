export const STAGE_NAMES = [
  "Semilla",
  "Brote",
  "Plántula",
  "Planta joven",
  "Arbusto",
  "Florecida",
] as const;
export const MAX_STAGE = STAGE_NAMES.length - 1;

/** Etapas que recorre la planta dentro de un pomodoro antes de florecer. */
const SESSION_GROWING_STAGES = 5;

/**
 * Etapa de la planta DENTRO de una sesión de foco: avanza una etapa cada quinto del
 * tiempo planeado (0–4) y solo florece (5) cuando la sesión termina como completada.
 */
export function sessionStage(
  elapsedSeconds: number,
  plannedSeconds: number,
  completed: boolean,
): number {
  if (completed) return MAX_STAGE;
  if (plannedSeconds <= 0 || elapsedSeconds <= 0) return 0;
  const stage = Math.floor((elapsedSeconds / plannedSeconds) * SESSION_GROWING_STAGES);
  return Math.min(SESSION_GROWING_STAGES - 1, stage);
}

/** Segundos hasta la próxima etapa; null en la última antes de florecer. */
export function nextStageIn(
  elapsedSeconds: number,
  plannedSeconds: number,
): number | null {
  const stage = sessionStage(elapsedSeconds, plannedSeconds, false);
  if (stage >= SESSION_GROWING_STAGES - 1) return null;
  const boundary = ((stage + 1) * plannedSeconds) / SESSION_GROWING_STAGES;
  return Math.ceil(boundary - Math.max(0, elapsedSeconds));
}
