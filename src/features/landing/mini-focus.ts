/**
 * Mini-foco de la portada: una demo LOCAL y acelerada (1 min) para probar la idea sin
 * cuenta. No habla con el servidor ni acredita nada. Respeta la misma regla del producto:
 * solo cuenta mientras la pestaña está visible y con foco.
 */

export const DEMO_SECONDS = 60;
const TOTAL_MS = DEMO_SECONDS * 1000;
/** Tope por paso: un timer atrasado o un salto de reloj no regala tiempo. */
const MAX_TICK_MS = 1000;
/**
 * La demo arranca con un brote ya visible (etapa 1, no una maceta vacía) y crece hasta la
 * etapa 4 mientras corre; al completar, florece (etapa 5).
 */
const FIRST_STAGE = 1;
const RUNNING_STEPS = 4;
const BLOOM_STAGE = 5;

export type DemoStatus = "idle" | "running" | "paused" | "done";

export interface DemoState {
  status: DemoStatus;
  elapsedMs: number;
  /** true si se pausó sola por salir de la pestaña (no por el botón). */
  autoPaused: boolean;
}

export const initialDemo: DemoState = { status: "idle", elapsedMs: 0, autoPaused: false };

export const resetDemo = (): DemoState => initialDemo;

export function startDemo(s: DemoState): DemoState {
  if (s.status === "running") return s;
  if (s.status === "done") return { status: "running", elapsedMs: 0, autoPaused: false };
  return { status: "running", elapsedMs: s.elapsedMs, autoPaused: false };
}

export function pauseDemo(s: DemoState): DemoState {
  return s.status === "running" ? { ...s, status: "paused", autoPaused: false } : s;
}

export function autoPauseDemo(s: DemoState): DemoState {
  return s.status === "running" ? { ...s, status: "paused", autoPaused: true } : s;
}

export function tickDemo(s: DemoState, dtMs: number, attentive: boolean): DemoState {
  if (s.status !== "running") return s;
  if (!attentive) return autoPauseDemo(s);
  const dt = Math.min(Math.max(dtMs, 0), MAX_TICK_MS);
  const elapsedMs = Math.min(TOTAL_MS, s.elapsedMs + dt);
  return elapsedMs >= TOTAL_MS
    ? { status: "done", elapsedMs: TOTAL_MS, autoPaused: false }
    : { ...s, elapsedMs };
}

export function demoRemainingSeconds(s: DemoState): number {
  return s.status === "done" ? 0 : Math.ceil((TOTAL_MS - s.elapsedMs) / 1000);
}

export function demoProgress(s: DemoState): number {
  return s.status === "done" ? 1 : s.elapsedMs / TOTAL_MS;
}

export function demoStage(s: DemoState): number {
  if (s.status === "done") return BLOOM_STAGE;
  return (
    FIRST_STAGE + Math.min(RUNNING_STEPS - 1, Math.floor(demoProgress(s) * RUNNING_STEPS))
  );
}
