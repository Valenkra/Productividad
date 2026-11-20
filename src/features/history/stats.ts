import type { FocusInterval, FocusSession } from "@/features/focus-tracking/types";

export interface DayTotal {
  date: string; // YYYY-MM-DD en la zona horaria del usuario
  focusSeconds: number;
}

export interface Stats {
  timeZone: string;
  today: {
    date: string;
    focusSeconds: number;
    /** Focos completados que terminaron hoy. */
    pomodoros: number;
    goalSeconds: number;
  };
  days: DayTotal[];
  /** Días seguidos con foco. Si hoy aún no hubo, se cuenta desde ayer: descansar hoy no la rompe. */
  streakDays: number;
  perTask: { taskId: string; focusSeconds: number }[];
}

const DAY_MS = 86_400_000;

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function dayKey(ms: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/** Últimos `count` días (el más viejo primero), sin repetir claves aunque haya cambio de horario. */
function lastDayKeys(now: number, timeZone: string, count: number): string[] {
  const keys: string[] = [];
  for (let i = 0; keys.length < count && i < count + 3; i++) {
    const key = dayKey(now - i * DAY_MS, timeZone);
    if (!keys.includes(key)) keys.push(key);
  }
  return keys.reverse();
}

export function computeStats(input: {
  sessions: FocusSession[];
  intervals: FocusInterval[];
  timeZone: string;
  now: number;
  dailyGoalSeconds: number;
  days?: number;
}): Stats {
  const { sessions, intervals, timeZone, now, dailyGoalSeconds } = input;
  const focusSessions = new Map(
    sessions.filter((s) => s.mode === "focus").map((s) => [s.id, s]),
  );

  const byDay = new Map<string, number>();
  const byTask = new Map<string, number>();
  for (const iv of intervals) {
    const session = focusSessions.get(iv.sessionId);
    if (!session) continue; // los descansos no cuentan como foco
    const key = dayKey(iv.startedAt, timeZone);
    byDay.set(key, (byDay.get(key) ?? 0) + iv.creditedSeconds);
    if (session.taskId) {
      byTask.set(session.taskId, (byTask.get(session.taskId) ?? 0) + iv.creditedSeconds);
    }
  }

  const keys = lastDayKeys(now, timeZone, input.days ?? 14);
  const days = keys.map((date) => ({ date, focusSeconds: byDay.get(date) ?? 0 }));
  const todayKey = keys[keys.length - 1];
  const todaySeconds = byDay.get(todayKey) ?? 0;
  const todayPomodoros = sessions.filter(
    (s) =>
      s.mode === "focus" &&
      s.status === "completed" &&
      dayKey(s.endedAt ?? s.startedAt, timeZone) === todayKey,
  ).length;

  // Racha: hacia atrás desde hoy (o ayer si hoy todavía no hubo foco).
  let streak = 0;
  let cursor = todaySeconds > 0 ? now : now - DAY_MS;
  while ((byDay.get(dayKey(cursor, timeZone)) ?? 0) > 0 && streak < 3650) {
    streak++;
    cursor -= DAY_MS;
  }

  return {
    timeZone,
    today: {
      date: todayKey,
      focusSeconds: todaySeconds,
      pomodoros: todayPomodoros,
      goalSeconds: dailyGoalSeconds,
    },
    days,
    streakDays: streak,
    perTask: [...byTask]
      .map(([taskId, focusSeconds]) => ({ taskId, focusSeconds }))
      .sort((a, b) => b.focusSeconds - a.focusSeconds),
  };
}
