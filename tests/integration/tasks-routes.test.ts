import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestService } from "../helpers/fake-api";

vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));

let ctx: ReturnType<typeof createTestService>;
vi.mock("@/server/container", () => ({
  getFocusService: () => ctx.service,
  getTaskService: () => ctx.tasks,
}));

const collection = await import("@/app/api/tasks/route");
const item = await import("@/app/api/tasks/[id]/route");

const send = (method: string, body?: unknown, url = "http://x/api/tasks") =>
  new Request(url, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const create = async (body: unknown) =>
  (await (await collection.POST(send("POST", body))).json()).task;

beforeEach(() => {
  ctx = createTestService();
});

describe("POST /api/tasks", () => {
  it("crea una tarea pendiente", async () => {
    const res = await collection.POST(
      send("POST", { title: "  Leer  ", priority: "high" }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).task).toMatchObject({
      title: "Leer",
      priority: "high",
      status: "todo",
      completedAt: null,
    });
  });

  it("ignora status y userId enviados por el cliente", async () => {
    const task = await create({ title: "x", status: "done", userId: "otro" });
    expect(task).toMatchObject({ status: "todo", userId: "local-user" });
  });

  it.each([{}, { title: "" }, { title: "a", priority: "urgente" }])(
    "400 con %j",
    async (body) => {
      expect((await collection.POST(send("POST", body))).status).toBe(400);
    },
  );

  it("400 con JSON roto", async () => {
    const bad = new Request("http://x/api/tasks", { method: "POST", body: "{roto" });
    expect((await collection.POST(bad)).status).toBe(400);
  });
});

describe("GET /api/tasks", () => {
  const get = (q = "") =>
    collection.GET(send("GET", undefined, `http://x/api/tasks${q}`));

  it("lista vacía al inicio", async () => {
    expect((await (await get()).json()).tasks).toEqual([]);
  });

  it("oculta archivadas por defecto y las muestra con status=all", async () => {
    const a = await create({ title: "A" });
    await create({ title: "B" });
    await item.PATCH(send("PATCH", { status: "archived" }), params(a.id));
    expect(
      (await (await get()).json()).tasks.map((t: { title: string }) => t.title),
    ).toEqual(["B"]);
    expect((await (await get("?status=all")).json()).tasks).toHaveLength(2);
  });

  it("filtra por prioridad y ordena", async () => {
    await create({ title: "baja", priority: "low" });
    await create({ title: "alta", priority: "high" });
    const body = await (await get("?sort=priority")).json();
    expect(body.tasks.map((t: { title: string }) => t.title)).toEqual(["alta", "baja"]);
    expect((await (await get("?priority=low")).json()).tasks).toHaveLength(1);
  });

  it("400 con parámetros inválidos", async () => {
    expect((await get("?status=nada")).status).toBe(400);
    expect((await get("?sort=azar")).status).toBe(400);
  });
});

describe("PATCH /api/tasks/:id", () => {
  it("actualiza campos y completa con fecha del servidor", async () => {
    const task = await create({ title: "A" });
    ctx.advance(60);
    const res = await item.PATCH(
      send("PATCH", { status: "done", title: "A2" }),
      params(task.id),
    );
    expect((await res.json()).task).toMatchObject({
      title: "A2",
      status: "done",
      completedAt: ctx.now(),
    });
  });

  it("400 sin cambios o con valores inválidos", async () => {
    const task = await create({ title: "A" });
    expect((await item.PATCH(send("PATCH", {}), params(task.id))).status).toBe(400);
    expect(
      (await item.PATCH(send("PATCH", { status: "x" }), params(task.id))).status,
    ).toBe(400);
  });

  it("404 con id desconocido (el error de tarea llega como 404, no 500)", async () => {
    const res = await item.PATCH(send("PATCH", { title: "x" }), params("nope"));
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("task_not_found");
  });
});

describe("DELETE /api/tasks/:id", () => {
  it("elimina y luego da 404", async () => {
    const task = await create({ title: "A" });
    const res = await item.DELETE(send("DELETE"), params(task.id));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ deleted: true });
    expect((await item.DELETE(send("DELETE"), params(task.id))).status).toBe(404);
  });
});
