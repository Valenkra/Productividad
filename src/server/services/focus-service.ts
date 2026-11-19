import { randomUUID } from "node:crypto";
import {
  applyHeartbeat,
  createSession,
  finish,
  pause,
  reconcile,
  resume,
} from "@/features/focus-tracking/domain";
import type { FocusMode, FocusSession } from "@/features/focus-tracking/types";
import { nextMode, plannedSecondsFor } from "@/features/pomodoro/sequence";
import type { PomodoroSettings } from "@/features/pomodoro/settings";
import { DEFAULT_POMODORO_SETTINGS } from "@/features/pomodoro/settings";
import type { FocusRepository, UserProgress } from "../repositories/focus-repository";

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface FocusState {
  session: FocusSession | null;
  plantTotalSeconds: number;
  nextMode: FocusMode;
  nextPlannedSeconds: number;
  /** Hora del servidor, para que el cliente calcule su desfase. */
  serverNow: number;
}

export interface HeartbeatResponse extends FocusState {
  result: "credited" | "duplicate" | "too_soon" | "stale_paused" | "not_active";
  creditedSeconds: number;
}

type CycleProgress = Pick<UserProgress, "cycleFocusCount" | "lastMode">;

export function createFocusService(deps: {
  repo: FocusRepository;
  now?: () => number;
  newId?: () => string;
  settings?: PomodoroSettings;
}) {
  const { repo } = deps;
  const now = deps.now ?? Date.now;
  const newId = deps.newId ?? randomUUID;
  const settings = deps.settings ?? DEFAULT_POMODORO_SETTINGS;

  /** Qué pasa con el ciclo Pomodoro cuando una sesión termina. */
  function cycleAfter(session: FocusSession, p: UserProgress): CycleProgress {
    if (session.status === "completed") {
      if (session.mode === "focus") {
        return { cycleFocusCount: p.cycleFocusCount + 1, lastMode: "focus" };
      }
      return {
        cycleFocusCount: session.mode === "long_break" ? 0 : p.cycleFocusCount,
        lastMode: session.mode,
      };
    }
    // Abandonada: saltar un foco no habilita descanso; saltar un descanso vuelve a foco.
    return {
      cycleFocusCount: session.mode === "long_break" ? 0 : p.cycleFocusCount,
      lastMode: session.mode === "focus" ? null : session.mode,
    };
  }

  /** Carga la sesión del usuario aplicando el timeout conservador y persistiéndolo. */
  async function load(userId: string, id: string): Promise<FocusSession> {
    const stored = await repo.getSession(userId, id);
    if (!stored) throw new DomainError("not_found", 404, "Sesión no encontrada");
    return persistReconciled(stored);
  }

  async function persistReconciled(stored: FocusSession): Promise<FocusSession> {
    const current = reconcile(stored, now());
    if (current !== stored) await repo.saveSession(current);
    return current;
  }

  async function state(
    userId: string,
    session: FocusSession | null,
  ): Promise<FocusState> {
    const p = await repo.getProgress(userId);
    const next = nextMode(p.cycleFocusCount, p.lastMode, settings);
    return {
      session,
      plantTotalSeconds: p.plantTotalSeconds,
      nextMode: next,
      nextPlannedSeconds: plannedSecondsFor(next, settings),
      serverNow: now(),
    };
  }

  return {
    async getActive(userId: string): Promise<FocusState> {
      const open = await repo.getOpenSession(userId);
      return state(userId, open ? await persistReconciled(open) : null);
    },

    async start(userId: string, input: { taskId?: string | null; mode?: FocusMode }) {
      const open = await repo.getOpenSession(userId);
      if (open) {
        throw new DomainError(
          "session_open",
          409,
          "Ya hay una sesión abierta; reanudala o terminala",
        );
      }
      if (input.taskId && !(await repo.taskBelongsToUser(userId, input.taskId))) {
        throw new DomainError("task_not_found", 404, "Tarea no encontrada");
      }
      const p = await repo.getProgress(userId);
      const expected = nextMode(p.cycleFocusCount, p.lastMode, settings);
      const mode = input.mode ?? expected;
      const session = createSession({
        id: newId(),
        userId,
        taskId: input.taskId ?? null,
        mode,
        plannedSeconds: plannedSecondsFor(mode, settings),
        now: now(),
      });
      await repo.insertSession(session);
      return state(userId, session);
    },

    async heartbeat(
      userId: string,
      id: string,
      idempotencyKey: string,
    ): Promise<HeartbeatResponse> {
      const stored = await repo.getSession(userId, id);
      if (!stored) throw new DomainError("not_found", 404, "Sesión no encontrada");
      const session = await persistReconciled(stored);

      // Reintento: devolver el resultado original sin volver a acreditar.
      const previous = await repo.findInterval(session.id, idempotencyKey);
      if (previous) {
        return {
          ...(await state(userId, session)),
          result: "duplicate",
          creditedSeconds: previous.creditedSeconds,
        };
      }

      // Llegó tarde: la sesión venció por falta de heartbeats y se pausó. No se acredita.
      if (stored.status === "active" && session.status === "paused") {
        return {
          ...(await state(userId, session)),
          result: "stale_paused",
          creditedSeconds: 0,
        };
      }

      const outcome = applyHeartbeat(session, {
        now: now(),
        idempotencyKey,
        intervalId: newId(),
      });

      if (outcome.status === "credited" && outcome.interval) {
        const p = await repo.getProgress(userId);
        await repo.creditInterval({
          session: outcome.session,
          interval: outcome.interval,
          // Los descansos nunca hacen crecer la planta.
          plantSeconds: session.mode === "focus" ? outcome.creditedSeconds : 0,
          progress:
            outcome.session.status === "completed"
              ? cycleAfter(outcome.session, p)
              : undefined,
        });
      }
      return {
        ...(await state(userId, outcome.session)),
        result: outcome.status,
        creditedSeconds: outcome.creditedSeconds,
      };
    },

    async pause(userId: string, id: string) {
      const session = await load(userId, id);
      const next = pause(session, now());
      if (next !== session) await repo.saveSession(next);
      return state(userId, next);
    },

    async resume(userId: string, id: string) {
      const session = await load(userId, id);
      if (session.status !== "paused") {
        throw new DomainError(
          "invalid_state",
          409,
          "Solo se puede reanudar una sesión pausada",
        );
      }
      const next = resume(session, now());
      await repo.saveSession(next);
      return state(userId, next);
    },

    async finish(userId: string, id: string, outcome: "completed" | "abandoned") {
      const session = await load(userId, id);
      const result = finish(session, outcome, now());
      if (!result.ok) {
        throw new DomainError(
          result.reason,
          409,
          result.reason === "not_open"
            ? "La sesión ya terminó"
            : "Todavía no se acreditó el tiempo planeado",
        );
      }
      const p = await repo.getProgress(userId);
      await repo.saveSession(result.session, cycleAfter(result.session, p));
      return state(userId, result.session);
    },
  };
}

export type FocusService = ReturnType<typeof createFocusService>;
