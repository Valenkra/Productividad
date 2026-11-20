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
import { dueAtFor } from "@/features/tasks/due";
import { TasksView } from "@/features/tasks/tasks-view";
import { createTestService, installFakeApi, type FakeApi } from "../helpers/fake-api";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

let ctx: ReturnType<typeof createTestService>;
let api: FakeApi;

const seed = (title: string, over: Record<string, unknown> = {}) =>
  ctx.tasks.create("u", {
    title,
    description: null,
    subject: null,
    estimatedPomodoros: 2,
    priority: "medium",
    dueAt: null,
    ...over,
  });
const pending = () => screen.getByRole("list", { name: "Tareas pendientes" });
const done = () => screen.getByRole("list", { name: "Tareas hechas" });
const pendingTitles = () =>
  within(pending())
    .getAllByRole("listitem")
    .map((li) => li.getAttribute("data-title"));
const writes = () => api.calls.filter((c) => c.method !== "GET");

beforeEach(() => {
  ctx = createTestService();
  api = installFakeApi(ctx.service, "u", ctx.tasks);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("TasksView: estados", () => {
  it("sin tareas muestra la tarjeta de «todo hecho»", async () => {
    render(<TasksView />);
    expect(
      await screen.findByText("¡Todo hecho! Añade algo nuevo o date un respiro."),
    ).toBeTruthy();
    expect(screen.getByText("0 para hoy · 0 pendientes")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Tareas" })).toBeTruthy();
  });

  it("cuenta las de hoy y las pendientes en el subtítulo", async () => {
    await seed("Hoy", { dueAt: dueAtFor("today", Date.now()) });
    await seed("Sin fecha");
    const hecha = await seed("Hecha");
    await ctx.tasks.update("u", hecha.id, { status: "done" });
    render(<TasksView />);
    expect(await screen.findByText("1 para hoy · 2 pendientes")).toBeTruthy();
  });

  it("cada tarjeta muestra materia, prioridad escrita, fecha y pomodoros", async () => {
    await seed("Resumen", {
      subject: "historia",
      priority: "high",
      estimatedPomodoros: 4,
      dueAt: dueAtFor("tomorrow", Date.now()),
    });
    render(<TasksView />);
    const card = await screen.findByRole("listitem");
    expect(within(card).getByText("Resumen")).toBeTruthy();
    expect(within(card).getByText("Historia")).toBeTruthy();
    expect(within(card).getByText("Prioridad alta")).toBeTruthy();
    expect(within(card).getByText("Mañana")).toBeTruthy();
    expect(within(card).getByText("0 de 4 pomodoros")).toBeTruthy();
  });

  it("las archivadas no aparecen", async () => {
    const a = await seed("Archivada");
    await ctx.tasks.update("u", a.id, { status: "archived" });
    await seed("Visible");
    render(<TasksView />);
    await screen.findByText("Visible");
    expect(screen.queryByText("Archivada")).toBeNull();
  });

  it("si la lista no carga muestra el error", async () => {
    // Solo falla la lista de tareas (los ajustes cargan aparte).
    const real = globalThis.fetch;
    vi.stubGlobal("fetch", (url: string, init?: RequestInit) =>
      url.startsWith("/api/tasks") ? Promise.reject(new TypeError("x")) : real(url, init),
    );
    render(<TasksView />);
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /No se pudieron cargar/,
    );
  });
});

describe("TasksView: acciones", () => {
  it("la casilla completa la tarea y pasa a «Hechas» con su avance", async () => {
    await seed("Leer");
    render(<TasksView />);
    fireEvent.click(await screen.findByRole("checkbox", { name: "Completar Leer" }));
    await waitFor(() => expect(within(done()).getByText("Leer")).toBeTruthy());
    expect(writes()[0]).toMatchObject({ method: "PATCH", body: { status: "done" } });
    expect(within(done()).getByText("0/2")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Hechas" })).toBeTruthy();
  });

  it("una hecha se puede reabrir", async () => {
    const t = await seed("Leer");
    await ctx.tasks.update("u", t.id, { status: "done" });
    render(<TasksView />);
    fireEvent.click(await screen.findByRole("checkbox", { name: "Reabrir Leer" }));
    await waitFor(() => expect(pendingTitles()).toEqual(["Leer"]));
    expect(writes()[0]).toMatchObject({ body: { status: "todo" } });
  });

  it("el botón de play lleva a Foco con la tarea elegida", async () => {
    const t = await seed("Leer");
    render(<TasksView />);
    const play = await screen.findByRole("link", { name: "Estudiar Leer" });
    expect(play.getAttribute("href")).toBe(`/focus?task=${t.id}`);
  });

  it("si el servidor falla al guardar, informa y no rompe la lista", async () => {
    await seed("Leer");
    render(<TasksView />);
    const box = await screen.findByRole("checkbox", { name: "Completar Leer" });
    api.failNext(1);
    fireEvent.click(box);
    expect((await screen.findByRole("alert")).textContent).toMatch(/No se pudo guardar/);
    expect(pendingTitles()).toEqual(["Leer"]);
  });
});

describe("TasksView: hoja de edición", () => {
  it("el botón flotante abre «Nueva tarea» y al guardar aparece en la lista", async () => {
    render(<TasksView />);
    fireEvent.click(await screen.findByRole("button", { name: "Añadir tarea" }));
    const dialog = screen.getByRole("dialog", { name: "Nueva tarea" });
    fireEvent.change(within(dialog).getByLabelText("Título"), {
      target: { value: "Entregar informe" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(pendingTitles()).toEqual(["Entregar informe"]));
  });

  it("tocar una tarjeta abre «Editar tarea» y guarda los cambios", async () => {
    await seed("Antes");
    render(<TasksView />);
    fireEvent.click(await screen.findByRole("button", { name: "Editar Antes" }));
    const dialog = screen.getByRole("dialog", { name: "Editar tarea" });
    fireEvent.change(within(dialog).getByLabelText("Título"), {
      target: { value: "Después" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(pendingTitles()).toEqual(["Después"]));
  });

  it("eliminar desde la hoja la quita de la lista", async () => {
    await seed("Borrar");
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<TasksView />);
    fireEvent.click(await screen.findByRole("button", { name: "Editar Borrar" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar tarea" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(screen.queryByText("Borrar")).toBeNull());
  });

  it("usa la duración de foco de los ajustes para el total de minutos", async () => {
    await ctx.service.updateSettings("u", { focusMinutes: 50 });
    render(<TasksView />);
    fireEvent.click(await screen.findByRole("button", { name: "Añadir tarea" }));
    expect(await screen.findByText("100 min")).toBeTruthy();
  });
});
