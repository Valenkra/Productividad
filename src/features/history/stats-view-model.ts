import { subjectOf, type SubjectId } from "@/features/tasks/subjects";
import type { DayTotal } from "./stats";

export interface WeekBar {
  label: string;
  date: string;
  minutes: number;
  kind: "past" | "today" | "future";
}

const LETTERS = ["L", "M", "X", "J", "V", "S", "D"];

/** `YYYY-MM-DD` desplazado `offset` días (aritmética de calendario en UTC, sin zona). */
function shift(date: string, offset: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + offset)).toISOString().slice(0, 10);
}

/** Barras de lunes a domingo de la semana de `today` (claves ya en la zona del usuario). */
export function weekBars(days: DayTotal[], today: string): WeekBar[] {
  const [y, m, d] = today.split("-").map(Number);
  const weekday = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7; // 0 = lunes
  const byDate = new Map(days.map((x) => [x.date, x.focusSeconds]));
  return LETTERS.map((label, i) => {
    const date = shift(today, i - weekday);
    return {
      label,
      date,
      minutes: Math.round((byDate.get(date) ?? 0) / 60),
      kind: i < weekday ? "past" : i === weekday ? "today" : "future",
    };
  });
}

export interface SubjectRow {
  subject: SubjectId | null;
  name: string;
  minutes: number;
}

/** Minutos por materia a partir del foco por tarea; lo que no tiene materia va junto. */
export function minutesBySubject(
  perTask: { taskId: string; focusSeconds: number }[],
  tasks: { id: string; subject: SubjectId | null }[],
): SubjectRow[] {
  const subjectOfTask = new Map(tasks.map((t) => [t.id, t.subject]));
  const seconds = new Map<SubjectId | null, number>();
  for (const { taskId, focusSeconds } of perTask) {
    const subject = subjectOfTask.get(taskId) ?? null;
    seconds.set(subject, (seconds.get(subject) ?? 0) + focusSeconds);
  }
  return [...seconds]
    .map(([subject, s]) => ({
      subject,
      name: subjectOf(subject)?.name ?? "Sin materia",
      minutes: Math.round(s / 60),
    }))
    .filter((r) => r.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
}
