import type { Task } from "./types";

export type DueChip = "today" | "tomorrow" | "week" | "none";

/** Final del día local `offset` días después de `now`. */
function endOfDayFrom(now: number, offset: number): number {
  const d = new Date(now);
  return new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() + offset,
    23,
    59,
    59,
  ).getTime();
}

/** Final del domingo de la semana (lunes a domingo) de `now`. */
function endOfWeek(now: number): number {
  const day = new Date(now).getDay(); // 0 = domingo
  return endOfDayFrom(now, (7 - day) % 7);
}

/** Fecha límite (fin de día local) que corresponde a cada chip. */
export function dueAtFor(chip: DueChip, now: number): number | null {
  switch (chip) {
    case "today":
      return endOfDayFrom(now, 0);
    case "tomorrow":
      return endOfDayFrom(now, 1);
    case "week":
      return endOfWeek(now);
    case "none":
      return null;
  }
}

/** Chip que representa una fecha guardada; null si es una fecha propia (pasada o lejana). */
export function dueChipOf(dueAt: number | null, now: number): DueChip | null {
  if (dueAt === null) return "none";
  if (dueAt === endOfDayFrom(now, 0)) return "today";
  if (dueAt === endOfDayFrom(now, 1)) return "tomorrow";
  if (dueAt > endOfDayFrom(now, 1) && dueAt <= endOfWeek(now)) return "week";
  return null;
}

export function dueLabel(dueAt: number | null, now: number): string {
  if (dueAt === null) return "Sin fecha";
  if (dueAt < endOfDayFrom(now, 0)) return "Vencida";
  const chip = dueChipOf(dueAt, now);
  if (chip === "today") return "Hoy";
  if (chip === "tomorrow") return "Mañana";
  if (chip === "week") return "Esta semana";
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "short" }).format(
    new Date(dueAt),
  );
}

/** Abiertas que vencen hoy o ya vencieron. */
export function countDueToday(tasks: Task[], now: number): number {
  const end = endOfDayFrom(now, 0);
  return tasks.filter(
    (t) =>
      (t.status === "todo" || t.status === "in_progress") &&
      t.dueAt !== null &&
      t.dueAt <= end,
  ).length;
}
