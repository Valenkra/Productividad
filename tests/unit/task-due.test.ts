import { describe, expect, it } from "vitest";
import { countDueToday, dueAtFor, dueChipOf, dueLabel } from "@/features/tasks/due";
import type { Task } from "@/features/tasks/types";

// Se construye en hora local para no depender de la zona horaria de quien corre los tests.
const at = (y: number, m: number, d: number, h = 12, min = 0) =>
  new Date(y, m - 1, d, h, min).getTime();
const endOf = (y: number, m: number, d: number) =>
  new Date(y, m - 1, d, 23, 59, 59).getTime();

// Martes 10 de marzo de 2026 → la semana (lunes a domingo) termina el domingo 15.
const NOW = at(2026, 3, 10, 15);

describe("dueAtFor", () => {
  it("Hoy y Mañana son el final de ese día local", () => {
    expect(dueAtFor("today", NOW)).toBe(endOf(2026, 3, 10));
    expect(dueAtFor("tomorrow", NOW)).toBe(endOf(2026, 3, 11));
  });

  it("Esta semana es el final del domingo", () => {
    expect(dueAtFor("week", NOW)).toBe(endOf(2026, 3, 15));
    // Un domingo, «esta semana» es ese mismo día.
    expect(dueAtFor("week", at(2026, 3, 15, 9))).toBe(endOf(2026, 3, 15));
  });

  it("Sin fecha es null", () => {
    expect(dueAtFor("none", NOW)).toBeNull();
  });

  it("cruza el fin de mes y de año", () => {
    expect(dueAtFor("tomorrow", at(2026, 12, 31, 20))).toBe(endOf(2027, 1, 1));
  });
});

describe("dueChipOf", () => {
  it("reconoce cada chip a partir de la fecha guardada", () => {
    expect(dueChipOf(null, NOW)).toBe("none");
    expect(dueChipOf(endOf(2026, 3, 10), NOW)).toBe("today");
    expect(dueChipOf(endOf(2026, 3, 11), NOW)).toBe("tomorrow");
    expect(dueChipOf(endOf(2026, 3, 15), NOW)).toBe("week");
  });

  it("una fecha propia (pasada o lejana) no coincide con ningún chip", () => {
    expect(dueChipOf(endOf(2026, 3, 9), NOW)).toBeNull();
    expect(dueChipOf(endOf(2026, 3, 16), NOW)).toBeNull();
  });
});

describe("dueLabel", () => {
  it.each([
    [null, "Sin fecha"],
    [endOf(2026, 3, 10), "Hoy"],
    [endOf(2026, 3, 11), "Mañana"],
    [endOf(2026, 3, 13), "Esta semana"],
    [endOf(2026, 3, 9), "Vencida"],
  ])("%s → %s", (dueAt, label) => {
    expect(dueLabel(dueAt, NOW)).toBe(label);
  });

  it("más allá de la semana muestra día y mes", () => {
    expect(dueLabel(endOf(2026, 3, 20), NOW)).toMatch(/20/);
  });
});

const task = (over: Partial<Task>): Task => ({
  id: "t",
  userId: "u",
  title: "x",
  description: null,
  subject: null,
  estimatedPomodoros: 2,
  status: "todo",
  priority: "medium",
  dueAt: null,
  completedAt: null,
  position: 1,
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe("countDueToday", () => {
  it("cuenta las abiertas que vencen hoy o ya vencieron", () => {
    const tasks = [
      task({ dueAt: endOf(2026, 3, 10) }),
      task({ dueAt: endOf(2026, 3, 8), status: "in_progress" }),
      task({ dueAt: endOf(2026, 3, 11) }),
      task({ dueAt: null }),
      task({ dueAt: endOf(2026, 3, 10), status: "done" }),
    ];
    expect(countDueToday(tasks, NOW)).toBe(2);
  });
});
