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
import { TaskSheet } from "@/features/tasks/task-sheet";
import type { TaskWithProgress } from "@/features/tasks/types";
import { createTestService, installFakeApi, type FakeApi } from "../helpers/fake-api";

const NOW = new Date(2026, 2, 10, 15).getTime(); // martes 10 de marzo de 2026, hora local

let ctx: ReturnType<typeof createTestService>;
let api: FakeApi;
const onClose = vi.fn();
const onSaved = vi.fn();
const onDeleted = vi.fn();

beforeEach(() => {
  ctx = createTestService();
  api = installFakeApi(ctx);
  onClose.mockClear();
  onSaved.mockClear();
  onDeleted.mockClear();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const open = (task: TaskWithProgress | null = null, focusMinutes = 25) =>
  render(
    <TaskSheet
      task={task}
      focusMinutes={focusMinutes}
      now={NOW}
      onClose={onClose}
      onSaved={onSaved}
      onDeleted={onDeleted}
    />,
  );
const seed = (over: Record<string, unknown> = {}) =>
  ctx.tasks.create("u", {
    title: "Ejercicios tema 4",
    description: null,
    subject: "calculo",
    estimatedPomodoros: 4,
    priority: "high",
    dueAt: dueAtFor("today", NOW),
    ...over,
  });
const writes = () => api.calls.filter((c) => c.method !== "GET");

describe("TaskSheet: nueva tarea", () => {
  it("es un diálogo «Nueva tarea» con los valores por defecto", () => {
    open();
    const dialog = screen.getByRole("dialog", { name: "Nueva tarea" });
    expect(within(dialog).getByRole("heading", { name: "Nueva tarea" })).toBeTruthy();
    expect(
      (within(dialog).getByLabelText("Título") as HTMLInputElement).placeholder,
    ).toBe("¿Qué tienes que estudiar?");
    expect(
      within(dialog).getByRole("radio", { name: "Media" }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(within(dialog).getByText("2")).toBeTruthy(); // pomodoros por defecto
    expect(within(dialog).getByText("50 min")).toBeTruthy();
    expect(within(dialog).queryByRole("button", { name: "Eliminar tarea" })).toBeNull();
  });

  it("crea la tarea con materia, prioridad, pomodoros y fecha elegidos", async () => {
    open();
    fireEvent.change(screen.getByLabelText("Título"), {
      target: { value: "  Repasar enlaces  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Química" }));
    fireEvent.click(screen.getByRole("radio", { name: "Alta" }));
    fireEvent.click(screen.getByRole("button", { name: "Más pomodoros" }));
    fireEvent.click(screen.getByRole("button", { name: "Mañana" }));
    expect(screen.getByText("75 min")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
    expect(writes()).toHaveLength(1);
    expect(writes()[0]).toMatchObject({
      url: "/api/tasks",
      method: "POST",
      body: {
        title: "Repasar enlaces",
        subject: "quimica",
        priority: "high",
        estimatedPomodoros: 3,
        dueAt: dueAtFor("tomorrow", NOW),
      },
    });
    expect(onSaved.mock.calls[0][0]).toMatchObject({ title: "Repasar enlaces" });
  });

  it("sin título avisa en rojo y no envía nada", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(screen.getByRole("alert").textContent).toBe("Ponle un nombre a la tarea");
    expect(writes()).toHaveLength(0);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("los pomodoros van de 1 a 12", () => {
    open();
    const less = screen.getByRole("button", { name: "Menos pomodoros" });
    const more = screen.getByRole("button", { name: "Más pomodoros" });
    for (let i = 0; i < 5; i++) fireEvent.click(less);
    expect((less as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("1")).toBeTruthy();
    for (let i = 0; i < 20; i++) fireEvent.click(more);
    expect((more as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("12")).toBeTruthy();
  });

  it("el total de minutos usa la duración de foco de los ajustes", () => {
    open(null, 50);
    expect(screen.getByText("100 min")).toBeTruthy();
  });

  it("si el servidor falla, avisa y no cierra", async () => {
    api.failNext(1);
    open();
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Algo" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/No se pudo guardar/);
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe("TaskSheet: editar", () => {
  it("precarga la tarea y envía un PATCH con los cambios", async () => {
    const task = await seed();
    open(task);
    expect(screen.getByRole("dialog", { name: "Editar tarea" })).toBeTruthy();
    expect((screen.getByLabelText("Título") as HTMLInputElement).value).toBe(
      "Ejercicios tema 4",
    );
    expect(
      screen.getByRole("button", { name: "Cálculo" }).getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByRole("radio", { name: "Alta" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(screen.getByRole("button", { name: "Hoy" }).getAttribute("aria-pressed")).toBe(
      "true",
    );
    fireEvent.change(screen.getByLabelText("Título"), { target: { value: "Tema 5" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(writes()[0]).toMatchObject({
      url: `/api/tasks/${task.id}`,
      method: "PATCH",
      body: { title: "Tema 5", subject: "calculo", estimatedPomodoros: 4 },
    });
  });

  it("una fecha propia no coincide con ningún chip y se conserva si no se toca", async () => {
    const far = new Date(2026, 5, 20, 23, 59, 59).getTime();
    const task = await seed({ dueAt: far });
    open(task);
    for (const name of ["Hoy", "Mañana", "Esta semana", "Sin fecha"]) {
      expect(screen.getByRole("button", { name }).getAttribute("aria-pressed")).toBe(
        "false",
      );
    }
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(writes()[0].body).toMatchObject({ dueAt: far });
  });

  it("elegir «Sin fecha» borra la fecha límite", async () => {
    const task = await seed();
    open(task);
    fireEvent.click(screen.getByRole("button", { name: "Sin fecha" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalled());
    expect(writes()[0].body).toMatchObject({ dueAt: null });
  });

  it("eliminar pide confirmación y borra la tarea", async () => {
    const task = await seed();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    open(task);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar tarea" }));
    expect(confirm).toHaveBeenCalled();
    expect(writes()).toHaveLength(0);
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar tarea" }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(task.id));
    expect(writes()[0]).toMatchObject({ url: `/api/tasks/${task.id}`, method: "DELETE" });
  });
});

describe("TaskSheet: cerrar", () => {
  it.each([
    [
      "el botón de cerrar",
      () => fireEvent.click(screen.getByRole("button", { name: "Cerrar" })),
    ],
    [
      "tocar fuera de la hoja",
      () => fireEvent.click(screen.getByTestId("sheet-overlay")),
    ],
    ["Escape", () => fireEvent.keyDown(document, { key: "Escape" })],
  ])("se cierra con %s sin guardar", (_name, act) => {
    open();
    act();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(writes()).toHaveLength(0);
  });

  it("tocar dentro de la hoja no la cierra", () => {
    open();
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
  });
});
