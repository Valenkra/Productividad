import { describe, expect, it } from "vitest";
import { createSession } from "@/features/focus-tracking/domain";
import type { FocusInterval, FocusSession } from "@/features/focus-tracking/types";
import { computeStats, dayKey, isValidTimeZone } from "@/features/history/stats";
import { MemoryFocusRepository } from "@/server/repositories/memory-focus-repository";
import { DomainError } from "@/server/errors";
import { MemorySettingsRepository } from "@/server/repositories/memory-settings-repository";
import { MemoryTaskRepository } from "@/server/repositories/memory-task-repository";
import { createServices } from "@/server/services";

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

  it("calcula el foco de hoy; ignora descansos", () => {
    const items = [focus(NOW - 1000, 1800), focus(NOW - 5000, 900)];
    const brk = focus(NOW - 9000, 300);
    brk.session.mode = "short_break";
    const stats = run([...items, brk]);
    expect(stats.today.focusSeconds).toBe(2700);
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

  it("valida zonas horarias", () => {
    expect(isValidTimeZone("America/Montevideo")).toBe(true);
    expect(isValidTimeZone("No/Existe")).toBe(false);
  });
});

describe("servicio: ajustes y stats", () => {
  const make = () => {
    let t = NOW;
    const services = createServices({
      focusRepo: new MemoryFocusRepository(),
      taskRepo: new MemoryTaskRepository(),
      settingsRepo: new MemorySettingsRepository(),
      now: () => t,
      newId: () => `id-${++n}`,
    });
    return { ...services, advance: (s: number) => (t += s * 1000) };
  };

  it("los ajustes cambian la duración de la próxima fase y la meta", async () => {
    const { focus, settings, stats } = make();
    await settings.updateSettings("u", { focusMinutes: 10, dailyGoalMinutes: 30 });
    const { session } = await focus.start("u", {});
    expect(session!.plannedSeconds).toBe(600);
    const result = await stats.getStats("u", TZ);
    expect(result.today.goalSeconds).toBe(1800);
  });

  it("los ajustes son por usuario", async () => {
    const { settings } = make();
    await settings.updateSettings("a", { focusMinutes: 50 });
    expect((await settings.getSettings("b")).focusMinutes).toBe(25);
  });

  it("stats refleja el tiempo acreditado y la planta", async () => {
    const { focus, stats, advance } = make();
    const { session } = await focus.start("u", {});
    advance(20);
    await focus.heartbeat("u", session!.id, "key-12345678");
    const result = await stats.getStats("u", TZ);
    expect(result.today.focusSeconds).toBe(20);
    expect(result.plantTotalSeconds).toBe(20);
  });

  it("rechaza zona horaria inválida", async () => {
    const { stats } = make();
    await expect(stats.getStats("u", "Nope/Nope")).rejects.toBeInstanceOf(DomainError);
  });
});
