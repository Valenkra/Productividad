import type { FocusInterval, FocusSession } from "@/features/focus-tracking/types";
import type { CreditInput, FocusRepository, UserProgress } from "./focus-repository";

/** Implementación local en memoria (se pierde al reiniciar el servidor). Temporal hasta Supabase. */
export class MemoryFocusRepository implements FocusRepository {
  private sessions = new Map<string, FocusSession>();
  private intervals = new Map<string, FocusInterval>();
  private progress = new Map<string, UserProgress>();

  async getSession(userId: string, id: string) {
    const s = this.sessions.get(id);
    return s && s.userId === userId ? s : null;
  }

  async getOpenSession(userId: string) {
    for (const s of this.sessions.values()) {
      if (s.userId === userId && (s.status === "active" || s.status === "paused"))
        return s;
    }
    return null;
  }

  async insertSession(session: FocusSession) {
    this.sessions.set(session.id, session);
  }

  async saveSession(session: FocusSession, progress?: Partial<UserProgress>) {
    this.sessions.set(session.id, session);
    if (progress) this.updateProgress(session.userId, progress);
  }

  async findInterval(sessionId: string, key: string) {
    return this.intervals.get(`${sessionId}:${key}`) ?? null;
  }

  async creditInterval({ session, interval, plantSeconds, progress }: CreditInput) {
    const key = `${interval.sessionId}:${interval.idempotencyKey}`;
    if (this.intervals.has(key)) throw new Error("Intervalo duplicado");
    // Un solo hilo + sin awaits intermedios: las tres escrituras son atómicas.
    this.sessions.set(session.id, session);
    this.intervals.set(key, interval);
    const p = this.getOrCreate(session.userId);
    this.progress.set(session.userId, {
      ...p,
      ...progress,
      plantTotalSeconds: p.plantTotalSeconds + plantSeconds,
    });
  }

  async getProgress(userId: string) {
    return { ...this.getOrCreate(userId) };
  }

  async listSessions(userId: string) {
    return [...this.sessions.values()].filter((s) => s.userId === userId);
  }

  async listIntervals(userId: string) {
    return [...this.intervals.values()].filter((i) => i.userId === userId);
  }

  private getOrCreate(userId: string): UserProgress {
    return (
      this.progress.get(userId) ?? {
        plantTotalSeconds: 0,
        cycleFocusCount: 0,
        lastMode: null,
      }
    );
  }

  private updateProgress(userId: string, patch: Partial<UserProgress>) {
    this.progress.set(userId, { ...this.getOrCreate(userId), ...patch });
  }
}
