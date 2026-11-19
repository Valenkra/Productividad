export const SECONDS_PER_GROWTH_UNIT = 60;
/** Unidades (minutos válidos) necesarias para alcanzar cada etapa. La Fase 5 lo refina. */
export const STAGE_THRESHOLDS = [0, 5, 15, 40, 90, 180] as const;

export function growthUnits(totalFocusSeconds: number): number {
  return Math.floor(totalFocusSeconds / SECONDS_PER_GROWTH_UNIT);
}

/** Segundos parciales hacia la siguiente unidad (0–59); se conservan entre sesiones. */
export function partialSeconds(totalFocusSeconds: number): number {
  return totalFocusSeconds % SECONDS_PER_GROWTH_UNIT;
}

export function growthStage(totalFocusSeconds: number): number {
  const units = growthUnits(totalFocusSeconds);
  let stage = 0;
  STAGE_THRESHOLDS.forEach((threshold, i) => {
    if (units >= threshold) stage = i;
  });
  return stage;
}
