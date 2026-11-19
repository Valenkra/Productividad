import { describe, expect, it } from "vitest";
import { isOverdue } from "@/features/tasks/domain";
import type { Task } from "@/features/tasks/types";
import { dateInputToMs, msToDateInput } from "@/lib/time/format";

const task = (over: Partial<Task> = {}): Task => ({
  id: "t",
  userId: "u",
  title: "x",
  description: null,
  status: "todo",
  priority: "medium",
  dueAt: 1000,
  completedAt: null,
  position: 1,
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe("isOverdue", () => {
  it("vencida solo si la fecha ya pasó y sigue abierta", () => {
    expect(isOverdue(task({ dueAt: 1000 }), 1001)).toBe(true);
    expect(isOverdue(task({ dueAt: 1000 }), 1000)).toBe(false);
    expect(isOverdue(task({ dueAt: 1000, status: "in_progress" }), 2000)).toBe(true);
  });

  it("no aplica a tareas sin fecha, hechas o archivadas", () => {
    expect(isOverdue(task({ dueAt: null }), 9e9)).toBe(false);
    expect(isOverdue(task({ status: "done" }), 9e9)).toBe(false);
    expect(isOverdue(task({ status: "archived" }), 9e9)).toBe(false);
  });
});

describe("fechas del formulario", () => {
  it("una fecha YYYY-MM-DD se guarda como el final de ese día local", () => {
    const ms = dateInputToMs("2026-03-10");
    const d = new Date(ms!);
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 2, 10]);
    expect([d.getHours(), d.getMinutes()]).toEqual([23, 59]);
  });

  it("ida y vuelta conserva el día", () => {
    expect(msToDateInput(dateInputToMs("2026-12-31"))).toBe("2026-12-31");
    expect(msToDateInput(dateInputToMs("2026-01-01"))).toBe("2026-01-01");
  });

  it("vacío o inválido → null / cadena vacía", () => {
    expect(dateInputToMs("")).toBeNull();
    expect(dateInputToMs("no-fecha")).toBeNull();
    expect(msToDateInput(null)).toBe("");
  });
});
