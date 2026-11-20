import { describe, expect, it } from "vitest";
import { taskMeta } from "@/features/tasks/task-meta";

describe("taskMeta", () => {
  it("muestra materia y avance de pomodoros", () => {
    expect(
      taskMeta({ subject: "calculo", completedPomodoros: 2, estimatedPomodoros: 4 }),
    ).toBe("Cálculo · 2 de 4 pomodoros");
  });

  it("sin materia muestra solo el avance", () => {
    expect(
      taskMeta({ subject: null, completedPomodoros: 0, estimatedPomodoros: 2 }),
    ).toBe("0 de 2 pomodoros");
  });
});
