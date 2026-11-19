import type {
  FocusInterval,
  FocusMode,
  FocusSession,
} from "@/features/focus-tracking/types";

export interface UserProgress {
  plantTotalSeconds: number;
  /** Bloques de foco completados desde el último descanso largo. */
  cycleFocusCount: number;
  /** Modo de la última fase terminada que determina la siguiente (null → foco). */
  lastMode: FocusMode | null;
}

export interface CreditInput {
  session: FocusSession;
  interval: FocusInterval;
  /** Segundos que suman a la planta (0 si no es un bloque de foco). */
  plantSeconds: number;
  progress?: Pick<UserProgress, "cycleFocusCount" | "lastMode">;
}

/**
 * Frontera de persistencia. La implementación de Supabase deberá hacer `creditInterval`
 * en UNA transacción (función SQL), con índice único (session_id, idempotency_key).
 */
export interface FocusRepository {
  getSession(userId: string, id: string): Promise<FocusSession | null>;
  /** Sesión activa o pausada del usuario (máximo una). */
  getOpenSession(userId: string): Promise<FocusSession | null>;
  insertSession(session: FocusSession): Promise<void>;
  saveSession(
    session: FocusSession,
    progress?: Pick<UserProgress, "cycleFocusCount" | "lastMode">,
  ): Promise<void>;
  findInterval(sessionId: string, idempotencyKey: string): Promise<FocusInterval | null>;
  /** Atómico: sesión + intervalo + total de la planta (+ progreso de ciclo). */
  creditInterval(input: CreditInput): Promise<void>;
  getProgress(userId: string): Promise<UserProgress>;
  taskBelongsToUser(userId: string, taskId: string): Promise<boolean>;
}
