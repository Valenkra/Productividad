export const SECONDS_PER_GROWTH_UNIT = 60;
/** Unidades (minutos válidos) necesarias para alcanzar cada etapa. */
export const STAGE_THRESHOLDS = [0, 5, 15, 40, 90, 180] as const;
export const STAGE_NAMES = [
  "Semilla",
  "Brote",
  "Plántula",
  "Planta joven",
  "Arbusto",
  "Florecida",
] as const;
export const MAX_STAGE = STAGE_THRESHOLDS.length - 1;

/** El crecimiento se deriva SOLO de los segundos válidos acumulados (fuente: servidor). */
export function growthUnits(totalFocusSeconds: number): number {
  return Math.floor(Math.max(0, totalFocusSeconds) / SECONDS_PER_GROWTH_UNIT);
}

/** Segundos parciales hacia la siguiente unidad (0–59); se conservan entre sesiones. */
export function partialSeconds(totalFocusSeconds: number): number {
  return Math.max(0, totalFocusSeconds) % SECONDS_PER_GROWTH_UNIT;
}

export function growthStage(totalFocusSeconds: number): number {
  const units = growthUnits(totalFocusSeconds);
  let stage = 0;
  STAGE_THRESHOLDS.forEach((threshold, i) => {
    if (units >= threshold) stage = i;
  });
  return stage;
}

export interface GrowthInfo {
  stage: number;
  name: string;
  units: number;
  partialSeconds: number;
  /** Minutos que faltan para la siguiente etapa; null si ya es la última. */
  unitsToNextStage: number | null;
  /** 0–1 dentro de la etapa actual (incluye los segundos parciales). */
  stageProgress: number;
}

export function growthInfo(totalFocusSeconds: number): GrowthInfo {
  const stage = growthStage(totalFocusSeconds);
  const units = growthUnits(totalFocusSeconds);
  const partial = partialSeconds(totalFocusSeconds);
  if (stage === MAX_STAGE) {
    return {
      stage,
      name: STAGE_NAMES[stage],
      units,
      partialSeconds: partial,
      unitsToNextStage: null,
      stageProgress: 1,
    };
  }
  const start = STAGE_THRESHOLDS[stage];
  const end = STAGE_THRESHOLDS[stage + 1];
  const exact = units - start + partial / SECONDS_PER_GROWTH_UNIT;
  return {
    stage,
    name: STAGE_NAMES[stage],
    units,
    partialSeconds: partial,
    unitsToNextStage: end - units,
    stageProgress: Math.min(1, exact / (end - start)),
  };
}

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
