import { randomUUID } from "node:crypto";
import { DomainError } from "../errors";
import {
  applyHeartbeat,
  createSession,
  finish,
  pause,
  reconcile,
  resume,
} from "@/features/focus-tracking/domain";
import type {
  FocusMode,
  FocusSession,
  FocusState,
  HeartbeatResponse,
} from "@/features/focus-tracking/types";
import { cycleAfter, nextMode, plannedSecondsFor } from "@/features/pomodoro/sequence";
import { DEFAULT_USER_SETTINGS, type UserSettings } from "@/features/settings/schema";
import type { FocusRepository } from "../repositories/focus-repository";

export function createFocusService(deps: {
  repo: FocusRepository;
  now?: () => number;
  newId?: () => string;
  /** ¿La tarea existe y es del usuario? Si no se inyecta, ninguna tarea es válida. */
  ownsTask?: (userId: string, taskId: string) => Promise<boolean>;
  /** Ajustes del usuario (duraciones y ciclo). Por defecto, los valores de fábrica. */
  getSettings?: (userId: string) => Promise<UserSettings>;
}) {
  const { repo } = deps;
  const ownsTask = deps.ownsTask ?? (async () => false);
  const now = deps.now ?? Date.now;
  const newId = deps.newId ?? randomUUID;
  const getSettings = deps.getSettings ?? (async () => DEFAULT_USER_SETTINGS);

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
    const settings = await getSettings(userId);
    const next = nextMode(p.cycleFocusCount, p.lastMode, settings);
    return {
      session,
      plantTotalSeconds: p.plantTotalSeconds,
      nextMode: next,
      nextPlannedSeconds: plannedSecondsFor(next, settings),
      cycleFocusCount: p.cycleFocusCount,
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
      if (input.taskId && !(await ownsTask(userId, input.taskId))) {
        throw new DomainError("task_not_found", 404, "Tarea no encontrada");
      }
      const p = await repo.getProgress(userId);
      const settings = await getSettings(userId);
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
              ? cycleAfter(outcome.session, p.cycleFocusCount)
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
      await repo.saveSession(
        result.session,
        cycleAfter(result.session, p.cycleFocusCount),
      );
      return state(userId, result.session);
    },
  };
}

export type FocusService = ReturnType<typeof createFocusService>;
