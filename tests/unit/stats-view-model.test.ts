import { describe, expect, it } from "vitest";
import { minutesBySubject, weekBars } from "@/features/history/stats-view-model";

const day = (date: string, minutes: number) => ({ date, focusSeconds: minutes * 60 });

describe("weekBars: semana de lunes a domingo", () => {
  it("ubica hoy y separa días pasados y futuros", () => {
    // 2026-03-11 es miércoles.
    const bars = weekBars(
      [
        day("2026-03-08", 99),
        day("2026-03-09", 25),
        day("2026-03-10", 0),
        day("2026-03-11", 50),
      ],
      "2026-03-11",
    );
    expect(bars).toEqual([
      { label: "L", date: "2026-03-09", minutes: 25, kind: "past" },
      { label: "M", date: "2026-03-10", minutes: 0, kind: "past" },
      { label: "X", date: "2026-03-11", minutes: 50, kind: "today" },
      { label: "J", date: "2026-03-12", minutes: 0, kind: "future" },
      { label: "V", date: "2026-03-13", minutes: 0, kind: "future" },
      { label: "S", date: "2026-03-14", minutes: 0, kind: "future" },
      { label: "D", date: "2026-03-15", minutes: 0, kind: "future" },
    ]);
  });

  it("un domingo es el último día y cruza el cambio de mes", () => {
    const bars = weekBars([day("2026-03-01", 30)], "2026-03-01");
    expect(bars[0].date).toBe("2026-02-23");
    expect(bars[6]).toEqual({
      label: "D",
      date: "2026-03-01",
      minutes: 30,
      kind: "today",
    });
  });

  it("redondea a minutos", () => {
    const bars = weekBars([{ date: "2026-03-09", focusSeconds: 89 }], "2026-03-09");
    expect(bars[0].minutes).toBe(1);
  });
});

describe("minutesBySubject", () => {
  it("suma por materia, ordena de mayor a menor y agrupa lo que no tiene materia", () => {
    const tasks = [
      { id: "a", subject: "calculo" as const },
      { id: "b", subject: "calculo" as const },
      { id: "c", subject: "ingles" as const },
      { id: "d", subject: null },
    ];
    const rows = minutesBySubject(
      [
        { taskId: "a", focusSeconds: 600 },
        { taskId: "b", focusSeconds: 900 },
        { taskId: "c", focusSeconds: 1800 },
        { taskId: "d", focusSeconds: 300 },
        { taskId: "borrada", focusSeconds: 120 },
      ],
      tasks,
    );
    expect(rows).toEqual([
      { subject: "ingles", name: "Inglés", minutes: 30 },
      { subject: "calculo", name: "Cálculo", minutes: 25 },
      { subject: null, name: "Sin materia", minutes: 7 },
    ]);
  });

  it("omite las materias sin minutos", () => {
    expect(
      minutesBySubject(
        [{ taskId: "a", focusSeconds: 10 }],
        [{ id: "a", subject: "quimica" }],
      ),
    ).toEqual([]);
  });
});
