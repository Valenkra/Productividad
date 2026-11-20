import { describe, expect, it } from "vitest";
import { createSession } from "@/features/focus-tracking/domain";
import type { FocusInterval, FocusSession } from "@/features/focus-tracking/types";
import { computeStats, dayKey, isValidTimeZone } from "@/features/history/stats";
import { MemoryFocusRepository } from "@/server/repositories/memory-focus-repository";
import { createFocusService, DomainError } from "@/server/services/focus-service";

const TZ = "America/Argentina/Buenos_Aires"; // UTC-3
const DAY = 86_400_000;
// 2026-03-10 15:00 UTC = 12:00 en Buenos Aires
const NOW = Date.UTC(2026, 2, 10, 15, 0, 0);

let n = 0;
function focus(startedAt: number, credited: number, taskId: string | null = null) {
  const session: FocusSession = {
    ...createSession({
      id: `s${++n}`,
      userId: "u",
      taskId,
      mode: "focus",
      plannedSeconds: 1500,
      now: startedAt,
    }),
    creditedSeconds: credited,
    status: "completed",
  };
  const interval: FocusInterval = {
    id: `i${n}`,
    sessionId: session.id,
    userId: "u",
    startedAt,
    endedAt: startedAt + credited * 1000,
    creditedSeconds: credited,
    idempotencyKey: `k${n}`,
    createdAt: startedAt,
  };
  return { session, interval };
}

const run = (items: ReturnType<typeof focus>[], now = NOW, goal = 3600) =>
  computeStats({
    sessions: items.map((i) => i.session),
    intervals: items.map((i) => i.interval),
    timeZone: TZ,
    now,
    dailyGoalSeconds: goal,
  });

describe("computeStats", () => {
  it("cuenta los pomodoros (focos completados) que terminaron hoy", () => {
    const done = focus(NOW - 2000, 1500);
    const ayer = focus(NOW - DAY, 1500);
    const abandonado = focus(NOW - 1000, 300);
    abandonado.session.status = "abandoned";
    const items = [done, ayer, abandonado].map((i) => ({
      ...i,
      session: {
        ...i.session,
        endedAt: i.session.startedAt + i.session.creditedSeconds * 1000,
      },
    }));
    expect(run(items).today.pomodoros).toBe(1);
  });

  it("agrupa por día en la zona horaria del usuario", () => {
    // 01:00 UTC del 10/3 todavía es 22:00 del 9/3 en Buenos Aires
    const lateNight = Date.UTC(2026, 2, 10, 1, 0, 0);
    expect(dayKey(lateNight, TZ)).toBe("2026-03-09");
    const stats = run([focus(lateNight, 600), focus(NOW - 1000, 300)]);
    expect(stats.days.at(-1)).toEqual({ date: "2026-03-10", focusSeconds: 300 });
    expect(stats.days.at(-2)).toEqual({ date: "2026-03-09", focusSeconds: 600 });
    expect(stats.days).toHaveLength(14);
  });

  it("calcula hoy, meta y total; ignora descansos", () => {
    const items = [focus(NOW - 1000, 1800), focus(NOW - 5000, 900)];
    const brk = focus(NOW - 9000, 300);
    brk.session.mode = "short_break";
    const stats = run([...items, brk]);
    expect(stats.today.focusSeconds).toBe(2700);
    expect(stats.today.sessions).toBe(2);
    expect(stats.today.goalProgress).toBeCloseTo(0.75);
    expect(stats.totalFocusSeconds).toBe(2700);
  });

  it("la meta no pasa de 100%", () => {
    expect(run([focus(NOW - 1000, 9999)]).today.goalProgress).toBe(1);
  });

  it("racha: no se rompe si hoy todavía no hubo foco", () => {
    const stats = run([focus(NOW - DAY, 600), focus(NOW - 2 * DAY, 600)]);
    expect(stats.streakDays).toBe(2);
    const withToday = run([focus(NOW - 1000, 60), focus(NOW - DAY, 600)]);
    expect(withToday.streakDays).toBe(2);
    const gap = run([focus(NOW - 3 * DAY, 600)]);
    expect(gap.streakDays).toBe(0);
  });

  it("suma minutos por tarea", () => {
    const stats = run([
      focus(NOW - 1000, 300, "t1"),
      focus(NOW - 2000, 600, "t1"),
      focus(NOW - 3000, 100, "t2"),
    ]);
    expect(stats.perTask).toEqual([
      { taskId: "t1", focusSeconds: 900 },
      { taskId: "t2", focusSeconds: 100 },
    ]);
  });

  it("separa tiempo planificado de acreditado en las sesiones recientes", () => {
    const [s] = run([focus(NOW - 1000, 400)]).recentSessions;
    expect(s).toMatchObject({ plannedSeconds: 1500, creditedSeconds: 400 });
  });

  it("valida zonas horarias", () => {
    expect(isValidTimeZone("America/Montevideo")).toBe(true);
    expect(isValidTimeZone("No/Existe")).toBe(false);
  });
});

describe("servicio: ajustes y stats", () => {
  const make = () => {
    let t = NOW;
    return {
      svc: createFocusService({
        repo: new MemoryFocusRepository(),
        now: () => t,
        newId: () => `id-${++n}`,
      }),
      advance: (s: number) => (t += s * 1000),
    };
  };

  it("los ajustes cambian la duración de la próxima fase y la meta", async () => {
    const { svc } = make();
    await svc.updateSettings("u", { focusMinutes: 10, dailyGoalMinutes: 30 });
    const { session } = await svc.start("u", {});
    expect(session!.plannedSeconds).toBe(600);
    const stats = await svc.getStats("u", TZ);
    expect(stats.today.goalSeconds).toBe(1800);
  });

  it("los ajustes son por usuario", async () => {
    const { svc } = make();
    await svc.updateSettings("a", { focusMinutes: 50 });
    expect((await svc.getSettings("b")).focusMinutes).toBe(25);
  });

  it("stats refleja el tiempo acreditado y la planta", async () => {
    const { svc, advance } = make();
    const { session } = await svc.start("u", {});
    advance(20);
    await svc.heartbeat("u", session!.id, "key-12345678");
    const stats = await svc.getStats("u", TZ);
    expect(stats.today.focusSeconds).toBe(20);
    expect(stats.plantTotalSeconds).toBe(20);
  });

  it("rechaza zona horaria inválida", async () => {
    const { svc } = make();
    await expect(svc.getStats("u", "Nope/Nope")).rejects.toBeInstanceOf(DomainError);
  });
});
