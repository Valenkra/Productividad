import { beforeEach, describe, expect, it } from "vitest";
import { MemoryTaskRepository } from "@/server/repositories/memory-task-repository";
import { createTaskService } from "@/server/services/task-service";

let t: number;
let svc: ReturnType<typeof createTaskService>;

beforeEach(() => {
  t = 1_000;
  let n = 0;
  svc = createTaskService({
    repo: new MemoryTaskRepository(),
    now: () => t,
    newId: () => `id-${++n}`,
  });
});

const input = (title: string, over = {}) => ({
  title,
  description: null,
  subject: null,
  estimatedPomodoros: 2,
  priority: "medium" as const,
  dueAt: null,
  ...over,
});

describe("pomodoros completados", () => {
  it("se derivan del contador inyectado y valen 0 si no hay sesiones", async () => {
    const withCounts = createTaskService({
      repo: new MemoryTaskRepository(),
      newId: () => "id-x",
      completedByTask: async () => new Map([["id-x", 3]]),
    });
    const task = await withCounts.create("a", input("Leer"));
    expect(task.completedPomodoros).toBe(3);
    expect((await withCounts.list("a", { sort: "manual" }))[0].completedPomodoros).toBe(
      3,
    );
    expect((await withCounts.get("a", task.id)).completedPomodoros).toBe(3);
    // Sin contador inyectado, siempre 0.
    expect((await svc.create("a", input("Otra"))).completedPomodoros).toBe(0);
  });
});

describe("crear y listar", () => {
  it("crea una tarea pendiente del usuario", async () => {
    const task = await svc.create("a", input("Leer"));
    expect(task).toMatchObject({
      id: "id-1",
      userId: "a",
      status: "todo",
      title: "Leer",
    });
  });

  it("asigna posiciones crecientes", async () => {
    const a = await svc.create("a", input("1"));
    const b = await svc.create("a", input("2"));
    expect(b.position).toBeGreaterThan(a.position);
  });

  it("lista en orden manual por defecto, sin archivadas", async () => {
    const a = await svc.create("a", input("1"));
    await svc.create("a", input("2"));
    await svc.update("a", a.id, { status: "archived" });
    expect((await svc.list("a", { sort: "manual" })).map((x) => x.title)).toEqual(["2"]);
    expect(
      (await svc.list("a", { sort: "manual", status: "all" })).map((x) => x.title),
    ).toEqual(["1", "2"]);
  });

  it("filtra y ordena según la consulta", async () => {
    await svc.create("a", input("baja", { priority: "low" }));
    await svc.create("a", input("alta", { priority: "high" }));
    const list = await svc.list("a", { sort: "priority", priority: "high" });
    expect(list.map((x) => x.title)).toEqual(["alta"]);
  });
});

describe("aislamiento entre usuarios", () => {
  it("cada usuario solo ve sus tareas", async () => {
    await svc.create("a", input("de A"));
    await svc.create("b", input("de B"));
    expect((await svc.list("a", { sort: "manual" })).map((x) => x.title)).toEqual([
      "de A",
    ]);
  });

  it("no se puede leer, modificar ni borrar una tarea ajena (404)", async () => {
    const task = await svc.create("a", input("secreta"));
    await expect(svc.get("b", task.id)).rejects.toMatchObject({
      status: 404,
      code: "task_not_found",
    });
    await expect(svc.update("b", task.id, { title: "hack" })).rejects.toMatchObject({
      status: 404,
    });
    await expect(svc.remove("b", task.id)).rejects.toMatchObject({ status: 404 });
    expect((await svc.get("a", task.id)).title).toBe("secreta");
  });

  it("las posiciones son independientes por usuario", async () => {
    await svc.create("a", input("1"));
    await svc.create("a", input("2"));
    expect((await svc.create("b", input("x"))).position).toBe(1);
  });
});

describe("actualizar", () => {
  it("completar fija completedAt con el reloj del servidor", async () => {
    const task = await svc.create("a", input("x"));
    t = 5_000;
    const done = await svc.update("a", task.id, { status: "done" });
    expect(done).toMatchObject({ status: "done", completedAt: 5_000, updatedAt: 5_000 });
  });

  it("persiste los cambios", async () => {
    const task = await svc.create("a", input("x"));
    await svc.update("a", task.id, { title: "y", priority: "high" });
    expect(await svc.get("a", task.id)).toMatchObject({ title: "y", priority: "high" });
  });

  it("404 si no existe", async () => {
    await expect(svc.update("a", "nope", { title: "x" })).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("eliminar", () => {
  it("borra la tarea", async () => {
    const task = await svc.create("a", input("x"));
    await svc.remove("a", task.id);
    await expect(svc.get("a", task.id)).rejects.toMatchObject({ status: 404 });
  });

  it("borrar dos veces → 404", async () => {
    const task = await svc.create("a", input("x"));
    await svc.remove("a", task.id);
    await expect(svc.remove("a", task.id)).rejects.toMatchObject({ status: 404 });
  });
});

describe("ownsTask (para asociar sesiones)", () => {
  it("true solo para el dueño", async () => {
    const task = await svc.create("a", input("x"));
    expect(await svc.ownsTask("a", task.id)).toBe(true);
    expect(await svc.ownsTask("b", task.id)).toBe(false);
    expect(await svc.ownsTask("a", "nope")).toBe(false);
  });
});
