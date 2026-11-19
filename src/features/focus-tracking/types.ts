export type FocusMode = "focus" | "short_break" | "long_break";
export type SessionStatus = "active" | "paused" | "completed" | "abandoned";

/** Todos los instantes son epoch ms generados por el SERVIDOR. */
export interface FocusSession {
  id: string;
  userId: string;
  taskId: string | null;
  mode: FocusMode;
  status: SessionStatus;
  plannedSeconds: number;
  creditedSeconds: number;
  startedAt: number;
  pausedAt: number | null;
  endedAt: number | null;
  /** Hasta dónde se acreditó tiempo. Avanza solo por segundos enteros acreditados. */
  cursorAt: number;
}

export interface FocusInterval {
  id: string;
  sessionId: string;
  userId: string;
  startedAt: number;
  endedAt: number;
  creditedSeconds: number;
  idempotencyKey: string;
  createdAt: number;
}

export type HeartbeatStatus = "credited" | "too_soon" | "stale_paused" | "not_active";

export interface HeartbeatOutcome {
  status: HeartbeatStatus;
  session: FocusSession;
  interval: FocusInterval | null;
  creditedSeconds: number;
}
