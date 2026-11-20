import { describe, expect, it } from "vitest";
import type { FocusSession } from "@/features/focus-tracking/types";
import {
  gardenPlants,
  groupPlantsByDay,
  type GardenPlant,
} from "@/features/garden/plants";
import { createTestService } from "../helpers/fake-api";

const session = (over: Partial<FocusSession>): FocusSession => ({
  id: "s",
  userId: "u",
  taskId: null,
  mode: "focus",
  status: "completed",
  plannedSeconds: 1500,
  creditedSeconds: 1500,
  startedAt: 0,
  pausedAt: null,
  endedAt: 1_000,
  cursorAt: 0,
  ...over,
});

describe("gardenPlants: una planta por foco completado", () => {
  it("solo los focos completados florecen; abandonados y descansos no", () => {
    const plants = gardenPlants(
      [
        session({ id: "ok" }),
        session({ id: "abandonado", status: "abandoned" }),
        session({ id: "descanso", mode: "short_break" }),
        session({ id: "abierto", status: "active", endedAt: null }),
      ],
      new Map(),
    );
    expect(plants.map((p) => p.id)).toEqual(["ok"]);
  });

  it("lleva tarea, materia, minutos y fecha; las más nuevas primero", () => {
    const tasks = new Map([["t1", { title: "Ensayo", subject: "historia" as const }]]);
    const plants = gardenPlants(
      [
        session({ id: "a", taskId: "t1", creditedSeconds: 1500, endedAt: 1_000 }),
        session({ id: "b", taskId: null, creditedSeconds: 3000, endedAt: 5_000 }),
        session({ id: "c", taskId: "borrada", creditedSeconds: 600, endedAt: 3_000 }),
      ],
      tasks,
    );
    expect(plants).toEqual<GardenPlant[]>([
      {
        id: "b",
        taskId: null,
        title: "Sesión libre",
        subject: null,
        minutes: 50,
        endedAt: 5_000,
      },
      {
        id: "c",
        taskId: "borrada",
        title: "Tarea eliminada",
        subject: null,
        minutes: 10,
        endedAt: 3_000,
      },
      {
        id: "a",
        taskId: "t1",
        title: "Ensayo",
        subject: "historia",
        minutes: 25,
        endedAt: 1_000,
      },
    ]);
  });
});

// Hora local, para no depender de la zona horaria de quien corre los tests.
const at = (d: number, h = 12) => new Date(2026, 2, d, h).getTime(); // marzo 2026
const NOW = at(11, 18); // miércoles 11 de marzo
const plant = (id: string, endedAt: number, minutes = 25): GardenPlant => ({
  id,
  taskId: null,
  title: id,
  subject: null,
  minutes,
  endedAt,
});

describe("groupPlantsByDay", () => {
  it("agrupa por día local con Hoy, Ayer y el nombre del día en la última semana", () => {
    const groups = groupPlantsByDay(
      [
        plant("a", at(11, 9)),
        plant("b", at(11, 8), 50),
        plant("c", at(10, 23)),
        plant("d", at(9, 10)),
        plant("e", at(1, 10)),
      ],
      NOW,
    );
    expect(
      groups.map((g) => [g.label, g.totalMinutes, g.plants.map((p) => p.id)]),
    ).toEqual([
      ["Hoy", 75, ["a", "b"]],
      ["Ayer", 25, ["c"]],
      ["Lunes", 25, ["d"]],
      ["1 de marzo", 25, ["e"]],
    ]);
  });

  it("sin plantas no hay grupos", () => {
    expect(groupPlantsByDay([], NOW)).toEqual([]);
  });
});

describe("getGarden en el servidor", () => {
  it("devuelve las plantas con el título de su tarea", async () => {
    const ctx = createTestService();
    const task = await ctx.tasks.create("u", {
      title: "Derivadas",
      description: null,
      subject: "calculo",
      estimatedPomodoros: 2,
      priority: "medium",
      dueAt: null,
    });
    const { session: s } = await ctx.service.start("u", { taskId: task.id });
    for (let i = 0; i < 101; i++) {
      ctx.advance(15);
      await ctx.service.heartbeat("u", s!.id, `g-${i}-xxxxxx`);
    }
    const garden = await ctx.garden.getGarden("u");
    expect(garden.plants).toEqual([
      expect.objectContaining({ title: "Derivadas", subject: "calculo", minutes: 25 }),
    ]);
    expect(garden.plantTotalSeconds).toBe(1500);
  });
});
