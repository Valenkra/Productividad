import { MAX_CREDIT_SECONDS, MIN_HEARTBEAT_SPACING_MS, STALE_TIMEOUT_MS } from "./config";
import type { FocusInterval, FocusMode, FocusSession, HeartbeatOutcome } from "./types";

/** Funciones puras: no leen reloj, red ni base de datos. `now` lo da el servidor. */

export function createSession(input: {
  id: string;
  userId: string;
  taskId: string | null;
  mode: FocusMode;
  plannedSeconds: number;
  now: number;
}): FocusSession {
  return {
    id: input.id,
    userId: input.userId,
    taskId: input.taskId,
    mode: input.mode,
    status: "active",
    plannedSeconds: input.plannedSeconds,
    creditedSeconds: 0,
    startedAt: input.now,
    pausedAt: null,
    endedAt: null,
    cursorAt: input.now,
  };
}

/** Si una sesión activa lleva demasiado sin heartbeats, se pausa (sin acreditar nada más). */
export function reconcile(session: FocusSession, now: number): FocusSession {
  if (session.status === "active" && now - session.cursorAt > STALE_TIMEOUT_MS) {
    return { ...session, status: "paused", pausedAt: session.cursorAt };
  }
  return session;
}

export function applyHeartbeat(
  session: FocusSession,
  input: { now: number; idempotencyKey: string; intervalId: string },
): HeartbeatOutcome {
  const { now } = input;
  const current = reconcile(session, now);
  if (current.status !== "active") {
    const status = session.status === "active" ? "stale_paused" : "not_active";
    return { status, session: current, interval: null, creditedSeconds: 0 };
  }

  const elapsedMs = now - current.cursorAt;
  if (elapsedMs < MIN_HEARTBEAT_SPACING_MS) {
    return { status: "too_soon", session: current, interval: null, creditedSeconds: 0 };
  }

  const remaining = current.plannedSeconds - current.creditedSeconds;
  const credited = Math.min(Math.floor(elapsedMs / 1000), MAX_CREDIT_SECONDS, remaining);
  const interval: FocusInterval = {
    id: input.intervalId,
    sessionId: current.id,
    userId: current.userId,
    startedAt: current.cursorAt,
    endedAt: current.cursorAt + credited * 1000,
    creditedSeconds: credited,
    idempotencyKey: input.idempotencyKey,
    createdAt: now,
  };
  const creditedSeconds = current.creditedSeconds + credited;
  const done = creditedSeconds >= current.plannedSeconds;
  return {
    status: "credited",
    interval,
    creditedSeconds: credited,
    session: {
      ...current,
      creditedSeconds,
      // El resto (<1 s) se conserva: el cursor solo avanza por segundos acreditados.
      cursorAt: interval.endedAt,
      status: done ? "completed" : "active",
      endedAt: done ? now : null,
    },
  };
}

/** Pausar NO acredita el tramo desde el último heartbeat: no se puede verificar. */
export function pause(session: FocusSession, now: number): FocusSession {
  const current = reconcile(session, now);
  if (current.status !== "active") return current;
  return { ...current, status: "paused", pausedAt: now };
}

export function resume(session: FocusSession, now: number): FocusSession {
  if (session.status !== "paused") return session;
  return { ...session, status: "active", pausedAt: null, cursorAt: now };
}

export type FinishResult =
  | { ok: true; session: FocusSession }
  | { ok: false; reason: "not_open" | "not_finished" };

/** "completed" solo si ya se acreditó el tiempo planeado; "abandoned" cubre terminar/saltar. */
export function finish(
  session: FocusSession,
  outcome: "completed" | "abandoned",
  now: number,
): FinishResult {
  if (session.status === "completed" || session.status === "abandoned") {
    return { ok: false, reason: "not_open" };
  }
  if (outcome === "completed" && session.creditedSeconds < session.plannedSeconds) {
    return { ok: false, reason: "not_finished" };
  }
  return {
    ok: true,
    session: { ...session, status: outcome, endedAt: now, pausedAt: null },
  };
}
