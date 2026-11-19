import { beforeEach, describe, expect, it } from "vitest";
import { createTestService } from "../helpers/fake-api";

let ctx: ReturnType<typeof createTestService>;
const U = "u";
const newTask = (title = "Estudiar álgebra", userId = U) =>
  ctx.tasks.create(userId, { title, description: null, priority: "medium", dueAt: null });

beforeEach(() => {
  ctx = createTestService();
});

describe("asociar una sesión a una tarea", () => {
  it("acepta una tarea propia y la guarda en la sesión", async () => {
    const task = await newTask();
    const { session } = await ctx.service.start(U, { taskId: task.id });
    expect(session?.taskId).toBe(task.id);
  });

  it("rechaza una tarea de otro usuario con 404 (sin revelar que existe)", async () => {
    const ajena = await newTask("secreta", "otro");
    await expect(ctx.service.start(U, { taskId: ajena.id })).rejects.toMatchObject({
      status: 404,
      code: "task_not_found",
    });
  });

  it("rechaza una tarea inexistente", async () => {
    await expect(
      ctx.service.start(U, { taskId: "11111111-1111-4111-8111-111111111111" }),
    ).rejects.toMatchObject({ code: "task_not_found" });
  });

  it("sin tarea sigue funcionando", async () => {
    const { session } = await ctx.service.start(U, {});
    expect(session?.taskId).toBeNull();
  });
});

describe("tiempo por tarea", () => {
  async function studyFor(taskId: string, seconds: number) {
    const { session } = await ctx.service.start(U, { taskId });
    ctx.advance(seconds);
    await ctx.service.heartbeat(U, session!.id, `key-${taskId}-${seconds}`);
    await ctx.service.finish(U, session!.id, "abandoned");
  }

  it("las estadísticas suman minutos por tarea", async () => {
    const a = await newTask("A");
    const b = await newTask("B");
    await studyFor(a.id, 20);
    await studyFor(b.id, 10);
    await studyFor(a.id, 5);
    const stats = await ctx.service.getStats(U, "UTC");
    expect(stats.perTask).toEqual([
      { taskId: a.id, focusSeconds: 25 },
      { taskId: b.id, focusSeconds: 10 },
    ]);
  });

  it("borrar la tarea no rompe la sesión en curso ni el tiempo ya acreditado", async () => {
    const task = await newTask();
    const { session } = await ctx.service.start(U, { taskId: task.id });
    await ctx.tasks.remove(U, task.id);
    ctx.advance(15);
    const r = await ctx.service.heartbeat(U, session!.id, "clave-0001");
    expect(r.creditedSeconds).toBe(15);
    expect((await ctx.service.getStats(U, "UTC")).perTask[0].focusSeconds).toBe(15);
  });
});
