import { beforeEach, describe, expect, it } from "vitest";
import { createTestService } from "../helpers/fake-api";

let ctx: ReturnType<typeof createTestService>;
const U = "u";
const newTask = (title = "Estudiar álgebra", userId = U) =>
  ctx.tasks.create(userId, {
    title,
    description: null,
    subject: null,
    estimatedPomodoros: 2,
    priority: "medium",
    dueAt: null,
  });

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

describe("pomodoros completados por tarea", () => {
  async function run(
    taskId: string | undefined,
    mode: "focus" | "short_break",
    end: "completed" | "abandoned",
  ) {
    const { session } = await ctx.service.start(U, { taskId, mode });
    // Heartbeats cada 15 s, como el cliente real.
    const steps = end === "completed" ? Math.ceil(session!.plannedSeconds / 15) + 1 : 2;
    for (let i = 0; i < steps; i++) {
      ctx.advance(15);
      await ctx.service.heartbeat(U, session!.id, `k-${session!.id}-${i}`);
    }
    if (end === "abandoned") await ctx.service.finish(U, session!.id, "abandoned");
  }
  const count = async (taskId: string) =>
    (await ctx.tasks.get(U, taskId)).completedPomodoros;

  it("cuenta solo los focos completados de esa tarea", async () => {
    const a = await newTask("A");
    const b = await newTask("B");
    expect(await count(a.id)).toBe(0);
    await run(a.id, "focus", "completed");
    await run(a.id, "focus", "completed");
    await run(b.id, "focus", "completed");
    expect(await count(a.id)).toBe(2);
    expect(await count(b.id)).toBe(1);
  });

  it("no cuenta focos abandonados ni descansos", async () => {
    const a = await newTask("A");
    await run(a.id, "focus", "abandoned");
    await run(undefined, "short_break", "completed");
    expect(await count(a.id)).toBe(0);
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
    const stats = await ctx.stats.getStats(U, "UTC");
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
    expect((await ctx.stats.getStats(U, "UTC")).perTask[0].focusSeconds).toBe(15);
  });
});
