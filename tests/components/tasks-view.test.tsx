// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TasksView } from "@/features/tasks/tasks-view";
import { createTestService, installFakeApi, type FakeApi } from "../helpers/fake-api";

let ctx: ReturnType<typeof createTestService>;
let api: FakeApi;

const seed = (title: string, over: Record<string, unknown> = {}) =>
  ctx.tasks.create("u", {
    title,
    description: null,
    priority: "medium",
    dueAt: null,
    ...over,
  });
const list = () => screen.getByRole("list", { name: "Tareas" });
const titles = () =>
  within(list())
    .getAllByRole("listitem")
    .map((li) => li.getAttribute("data-title"));
const mutations = () => api.calls.filter((c) => c.method !== "GET");

beforeEach(() => {
  ctx = createTestService();
  api = installFakeApi(ctx.service, "u", ctx.tasks);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("TasksView: estados", () => {
  it("estado vacío invita a crear la primera tarea", async () => {
    render(<TasksView />);
    expect(await screen.findByText(/Todavía no tenés tareas/)).toBeTruthy();
  });

  it("lista las tareas con prioridad escrita (no solo color) y fecha", async () => {
    await seed("Resumen", { priority: "high", dueAt: Date.UTC(2099, 0, 5, 12) });
    render(<TasksView />);
    const item = await screen.findByRole("listitem");
    expect(within(item).getByText("Resumen")).toBeTruthy();
    expect(within(item).getByText(/Prioridad alta/)).toBeTruthy();
    expect(within(item).getByText(/Vence/)).toBeTruthy();
  });

  it("marca como vencida una tarea abierta con fecha pasada", async () => {
    await seed("Atrasada", { dueAt: Date.UTC(2000, 0, 1) });
    render(<TasksView />);
    expect(await screen.findByText(/Vencida/)).toBeTruthy();
  });

  it("muestra el error si la lista no carga", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );
    render(<TasksView />);
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /No se pudieron cargar/,
    );
  });
});

describe("TasksView: crear", () => {
  it("crea una tarea con prioridad y fecha, y aparece en la lista", async () => {
    render(<TasksView />);
    await screen.findByText(/Todavía no tenés tareas/);
    fireEvent.change(screen.getByLabelText("Nueva tarea"), {
      target: { value: "Estudiar física" },
    });
    fireEvent.change(screen.getByLabelText("Prioridad de la nueva tarea"), {
      target: { value: "high" },
    });
    fireEvent.change(screen.getByLabelText("Fecha límite"), {
      target: { value: "2099-06-01" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));

    await waitFor(() => expect(titles()).toEqual(["Estudiar física"]));
    expect(mutations()[0]).toMatchObject({ method: "POST", url: "/api/tasks" });
    expect(mutations()[0].body).toMatchObject({
      title: "Estudiar física",
      priority: "high",
    });
    expect(typeof (mutations()[0].body as { dueAt: number }).dueAt).toBe("number");
    expect((screen.getByLabelText("Nueva tarea") as HTMLInputElement).value).toBe("");
  });

  it("título vacío: avisa y no envía nada", async () => {
    render(<TasksView />);
    await screen.findByText(/Todavía no tenés tareas/);
    fireEvent.change(screen.getByLabelText("Nueva tarea"), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/título/);
    expect(mutations()).toHaveLength(0);
  });
});

describe("TasksView: completar, archivar, eliminar", () => {
  it("el checkbox completa y reabre la tarea", async () => {
    await seed("A");
    render(<TasksView />);
    const box = (await screen.findByRole("checkbox", {
      name: /Marcar como hecha: A/,
    })) as HTMLInputElement;
    fireEvent.click(box);
    await waitFor(() => expect(mutations()[0].body).toEqual({ status: "done" }));
    await waitFor(() =>
      expect(
        (
          screen.getByRole("checkbox", {
            name: /Marcar como hecha: A/,
          }) as HTMLInputElement
        ).checked,
      ).toBe(true),
    );
    fireEvent.click(screen.getByRole("checkbox", { name: /Marcar como hecha: A/ }));
    await waitFor(() => expect(mutations()[1].body).toEqual({ status: "todo" }));
  });

  it("archivar la saca de la lista por defecto", async () => {
    await seed("A");
    await seed("B");
    render(<TasksView />);
    await screen.findByText("A");
    fireEvent.click(screen.getAllByRole("button", { name: /^Archivar/ })[0]);
    await waitFor(() => expect(titles()).toEqual(["B"]));
    expect(mutations()[0].body).toEqual({ status: "archived" });
  });

  it("eliminar pide confirmación", async () => {
    await seed("A");
    render(<TasksView />);
    await screen.findByText("A");
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: /^Eliminar/ }));
    expect(confirm).toHaveBeenCalled();
    expect(mutations()).toHaveLength(0);

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: /^Eliminar/ }));
    await screen.findByText(/Todavía no tenés tareas/);
    expect(mutations()[0]).toMatchObject({ method: "DELETE" });
  });

  it("si el servidor falla al guardar, informa y no rompe la lista", async () => {
    await seed("A");
    render(<TasksView />);
    await screen.findByText("A");
    api.failNext(1);
    fireEvent.click(screen.getByRole("checkbox", { name: /Marcar como hecha: A/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/No se pudo guardar/);
    expect(titles()).toEqual(["A"]);
  });
});

describe("TasksView: editar", () => {
  it("edita el título y la prioridad", async () => {
    await seed("Viejo");
    render(<TasksView />);
    await screen.findByText("Viejo");
    fireEvent.click(screen.getByRole("button", { name: /^Editar/ }));
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Nuevo" } });
    fireEvent.change(screen.getByLabelText("Prioridad"), { target: { value: "low" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(titles()).toEqual(["Nuevo"]));
    expect(mutations()[0].body).toMatchObject({ title: "Nuevo", priority: "low" });
  });

  it("cancelar no envía cambios", async () => {
    await seed("A");
    render(<TasksView />);
    await screen.findByText("A");
    fireEvent.click(screen.getByRole("button", { name: /^Editar/ }));
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(mutations()).toHaveLength(0);
    expect(screen.queryByLabelText("Título")).toBeNull();
  });

  it("no permite guardar un título vacío", async () => {
    await seed("A");
    render(<TasksView />);
    await screen.findByText("A");
    fireEvent.click(screen.getByRole("button", { name: /^Editar/ }));
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/título/);
    expect(mutations()).toHaveLength(0);
  });
});

describe("TasksView: filtros y orden", () => {
  it("filtra por prioridad y estado enviando la consulta al servidor", async () => {
    await seed("baja", { priority: "low" });
    await seed("alta", { priority: "high" });
    render(<TasksView />);
    await screen.findByText("alta");
    fireEvent.change(screen.getByLabelText("Filtrar por prioridad"), {
      target: { value: "high" },
    });
    await waitFor(() => expect(titles()).toEqual(["alta"]));
    expect(api.calls.at(-1)!.url).toContain("priority=high");

    fireEvent.change(screen.getByLabelText("Filtrar por prioridad"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Filtrar por estado"), {
      target: { value: "done" },
    });
    await screen.findByText(/No hay tareas con estos filtros/);
    expect(api.calls.at(-1)!.url).toContain("status=done");
  });

  it("ordena por prioridad", async () => {
    await seed("baja", { priority: "low" });
    await seed("alta", { priority: "high" });
    render(<TasksView />);
    await screen.findByText("alta");
    expect(titles()).toEqual(["baja", "alta"]); // orden manual
    fireEvent.change(screen.getByLabelText("Ordenar por"), {
      target: { value: "priority" },
    });
    await waitFor(() => expect(titles()).toEqual(["alta", "baja"]));
  });

  it("«Todas» incluye las archivadas", async () => {
    const t = await seed("vieja");
    await ctx.tasks.update("u", t.id, { status: "archived" });
    render(<TasksView />);
    await screen.findByText(/Todavía no tenés tareas/);
    fireEvent.change(screen.getByLabelText("Filtrar por estado"), {
      target: { value: "all" },
    });
    await waitFor(() => expect(titles()).toEqual(["vieja"]));
    expect(screen.getByRole("button", { name: /^Desarchivar/ })).toBeTruthy();
  });
});
