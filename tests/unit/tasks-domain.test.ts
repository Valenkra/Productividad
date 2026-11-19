import { describe, expect, it } from "vitest";
import {
  applyTaskUpdate,
  createTask,
  filterTasks,
  nextTask,
  sortTasks,
} from "@/features/tasks/domain";
import {
  createTaskSchema,
  listQuerySchema,
  updateTaskSchema,
} from "@/features/tasks/schema";
import type { Task } from "@/features/tasks/types";

const NOW = 1_000_000;
const make = (over: Partial<Task> = {}): Task => ({
  id: "t",
  userId: "u",
  title: "Estudiar",
  description: null,
  status: "todo",
  priority: "medium",
  dueAt: null,
  completedAt: null,
  position: 1,
  createdAt: NOW,
  updatedAt: NOW,
  ...over,
});

describe("createTaskSchema", () => {
  it("aplica valores por defecto y recorta el título", () => {
    expect(createTaskSchema.parse({ title: "  Leer cap. 3  " })).toEqual({
      title: "Leer cap. 3",
      description: null,
      priority: "medium",
      dueAt: null,
    });
  });

  it.each([
    ["título vacío", { title: "" }],
    ["título solo espacios", { title: "   " }],
    ["título muy largo", { title: "x".repeat(201) }],
    ["descripción muy larga", { title: "a", description: "x".repeat(2001) }],
    ["prioridad inválida", { title: "a", priority: "urgente" }],
    ["dueAt no entero", { title: "a", dueAt: 1.5 }],
    ["dueAt negativo", { title: "a", dueAt: -1 }],
  ])("rechaza %s", (_name, input) => {
    expect(createTaskSchema.safeParse(input).success).toBe(false);
  });

  it("no deja pasar status ni userId desde el cliente", () => {
    const parsed = createTaskSchema.parse({ title: "a", status: "done", userId: "otro" });
    expect(parsed).not.toHaveProperty("status");
    expect(parsed).not.toHaveProperty("userId");
  });
});

describe("updateTaskSchema", () => {
  it("acepta cambios parciales válidos", () => {
    expect(updateTaskSchema.safeParse({ status: "done" }).success).toBe(true);
    expect(updateTaskSchema.safeParse({ dueAt: null, priority: "high" }).success).toBe(
      true,
    );
  });

  it("exige al menos un campo y valida los valores", () => {
    expect(updateTaskSchema.safeParse({}).success).toBe(false);
    expect(updateTaskSchema.safeParse({ status: "borrada" }).success).toBe(false);
    expect(updateTaskSchema.safeParse({ title: "" }).success).toBe(false);
    expect(updateTaskSchema.safeParse({ position: -1 }).success).toBe(false);
  });
});

describe("listQuerySchema", () => {
  it("por defecto: orden manual, sin filtros", () => {
    expect(listQuerySchema.parse({})).toEqual({ sort: "manual" });
  });

  it("acepta estado (incl. all), prioridad y orden", () => {
    expect(
      listQuerySchema.parse({ status: "all", priority: "high", sort: "due" }),
    ).toEqual({
      status: "all",
      priority: "high",
      sort: "due",
    });
  });

  it("rechaza valores desconocidos", () => {
    expect(listQuerySchema.safeParse({ status: "x" }).success).toBe(false);
    expect(listQuerySchema.safeParse({ sort: "random" }).success).toBe(false);
  });
});

describe("createTask", () => {
  it("nace pendiente, del usuario, con posición y sin fecha de completado", () => {
    const task = createTask({
      id: "id-1",
      userId: "u",
      input: { title: "A", description: null, priority: "high", dueAt: 5 },
      position: 3,
      now: NOW,
    });
    expect(task).toEqual({
      id: "id-1",
      userId: "u",
      title: "A",
      description: null,
      status: "todo",
      priority: "high",
      dueAt: 5,
      completedAt: null,
      position: 3,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });
});

describe("applyTaskUpdate", () => {
  it("marcar como hecha fija completedAt", () => {
    const done = applyTaskUpdate(make(), { status: "done" }, NOW + 10);
    expect(done).toMatchObject({
      status: "done",
      completedAt: NOW + 10,
      updatedAt: NOW + 10,
    });
  });

  it("completar dos veces conserva la primera fecha", () => {
    const done = applyTaskUpdate(make(), { status: "done" }, NOW + 10);
    expect(applyTaskUpdate(done, { status: "done" }, NOW + 99).completedAt).toBe(
      NOW + 10,
    );
  });

  it("reabrir una tarea hecha borra completedAt", () => {
    const done = make({ status: "done", completedAt: NOW });
    expect(applyTaskUpdate(done, { status: "todo" }, NOW + 5).completedAt).toBeNull();
    expect(
      applyTaskUpdate(done, { status: "in_progress" }, NOW + 5).completedAt,
    ).toBeNull();
  });

  it("archivar una tarea hecha conserva cuándo se completó", () => {
    const done = make({ status: "done", completedAt: NOW });
    expect(applyTaskUpdate(done, { status: "archived" }, NOW + 5).completedAt).toBe(NOW);
  });

  it("solo cambia lo enviado y no muta el original", () => {
    const original = make({ description: "d" });
    const next = applyTaskUpdate(original, { title: "Nuevo" }, NOW + 1);
    expect(next).toMatchObject({ title: "Nuevo", description: "d", priority: "medium" });
    expect(original.title).toBe("Estudiar");
  });

  it("permite quitar la fecha límite y la descripción con null", () => {
    const t = make({ dueAt: 9, description: "d" });
    expect(applyTaskUpdate(t, { dueAt: null, description: null }, NOW)).toMatchObject({
      dueAt: null,
      description: null,
    });
  });

  it("nunca cambia id, usuario ni createdAt", () => {
    const next = applyTaskUpdate(make(), { title: "x" }, NOW + 1);
    expect(next).toMatchObject({ id: "t", userId: "u", createdAt: NOW });
  });
});

describe("filterTasks", () => {
  const tasks = [
    make({ id: "1", status: "todo", priority: "low" }),
    make({ id: "2", status: "in_progress", priority: "high" }),
    make({ id: "3", status: "done", priority: "high" }),
    make({ id: "4", status: "archived", priority: "low" }),
  ];
  const ids = (list: Task[]) => list.map((t) => t.id);

  it("sin estado: oculta las archivadas", () => {
    expect(ids(filterTasks(tasks, {}))).toEqual(["1", "2", "3"]);
  });

  it("status=all incluye archivadas", () => {
    expect(ids(filterTasks(tasks, { status: "all" }))).toEqual(["1", "2", "3", "4"]);
  });

  it("filtra por un estado concreto", () => {
    expect(ids(filterTasks(tasks, { status: "archived" }))).toEqual(["4"]);
    expect(ids(filterTasks(tasks, { status: "done" }))).toEqual(["3"]);
  });

  it("combina estado y prioridad", () => {
    expect(ids(filterTasks(tasks, { priority: "high" }))).toEqual(["2", "3"]);
    expect(ids(filterTasks(tasks, { status: "todo", priority: "high" }))).toEqual([]);
  });
});

describe("sortTasks", () => {
  const ids = (list: Task[]) => list.map((t) => t.id);

  it("manual: por posición ascendente", () => {
    const list = [make({ id: "b", position: 2 }), make({ id: "a", position: 1 })];
    expect(ids(sortTasks(list, "manual"))).toEqual(["a", "b"]);
  });

  it("due: la más próxima primero y sin fecha al final", () => {
    const list = [
      make({ id: "sin", dueAt: null }),
      make({ id: "tarde", dueAt: 200 }),
      make({ id: "pronto", dueAt: 100 }),
    ];
    expect(ids(sortTasks(list, "due"))).toEqual(["pronto", "tarde", "sin"]);
  });

  it("priority: alta, media, baja; desempata por fecha", () => {
    const list = [
      make({ id: "baja", priority: "low" }),
      make({ id: "alta-tarde", priority: "high", dueAt: 300 }),
      make({ id: "media", priority: "medium" }),
      make({ id: "alta-pronto", priority: "high", dueAt: 100 }),
    ];
    expect(ids(sortTasks(list, "priority"))).toEqual([
      "alta-pronto",
      "alta-tarde",
      "media",
      "baja",
    ]);
  });

  it("created: la más nueva primero", () => {
    const list = [
      make({ id: "vieja", createdAt: 1 }),
      make({ id: "nueva", createdAt: 9 }),
    ];
    expect(ids(sortTasks(list, "created"))).toEqual(["nueva", "vieja"]);
  });

  it("no muta la lista recibida", () => {
    const list = [make({ id: "b", position: 2 }), make({ id: "a", position: 1 })];
    sortTasks(list, "manual");
    expect(ids(list)).toEqual(["b", "a"]);
  });
});

describe("nextTask", () => {
  it("null si no hay pendientes (hechas y archivadas no cuentan)", () => {
    expect(nextTask([])).toBeNull();
    expect(nextTask([make({ status: "done" }), make({ status: "archived" })])).toBeNull();
  });

  it("prioriza la que está en curso", () => {
    const list = [
      make({ id: "alta", priority: "high" }),
      make({ id: "curso", status: "in_progress", priority: "low" }),
    ];
    expect(nextTask(list)?.id).toBe("curso");
  });

  it("luego prioridad alta, luego fecha más próxima, luego posición", () => {
    expect(
      nextTask([
        make({ id: "m", priority: "medium" }),
        make({ id: "a", priority: "high" }),
      ])?.id,
    ).toBe("a");
    expect(
      nextTask([make({ id: "tarde", dueAt: 20 }), make({ id: "pronto", dueAt: 10 })])?.id,
    ).toBe("pronto");
    expect(
      nextTask([make({ id: "2", position: 2 }), make({ id: "1", position: 1 })])?.id,
    ).toBe("1");
  });
});
