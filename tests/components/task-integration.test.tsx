// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FocusPanel } from "@/features/focus-tracking/focus-panel";
import { useFocusSession } from "@/features/focus-tracking/use-focus-session";
import { DashboardView } from "@/features/history/dashboard-view";
import { HistoryView } from "@/features/history/history-view";
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
    priority: "medium",
    dueAt: null,
    ...over,
  });

beforeEach(() => {
  ctx = createTestService();
  api = installFakeApi(ctx.service, "u", ctx.tasks);
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  Object.defineProperty(navigator, "sendBeacon", {
    value: () => true,
    configurable: true,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useFocusSession.start con tarea", () => {
  it("envía el taskId elegido", async () => {
    const task = await seed("Cálculo");
    const { result } = renderHook(() => useFocusSession());
    await act(async () => {});
    await act(async () => {
      await result.current.start(task.id);
    });
    expect(api.calls.find((c) => c.method === "POST")!.body).toEqual({ taskId: task.id });
    expect(result.current.session?.taskId).toBe(task.id);
  });

  it("sin tarea no envía taskId", async () => {
    const { result } = renderHook(() => useFocusSession());
    await act(async () => {});
    await act(async () => {
      await result.current.start();
    });
    expect(api.calls.find((c) => c.method === "POST")!.body).toEqual({});
  });
});

describe("FocusPanel con tareas", () => {
  it("ofrece elegir una tarea pendiente (no las hechas) o ninguna", async () => {
    await seed("Pendiente");
    const hecha = await seed("Hecha");
    await ctx.tasks.update("u", hecha.id, { status: "done" });
    render(<FocusPanel />);
    const select = (await screen.findByLabelText(
      "Tarea (opcional)",
    )) as HTMLSelectElement;
    const options = within(select)
      .getAllByRole("option")
      .map((o) => o.textContent);
    expect(options).toEqual(["Sin tarea", "Pendiente"]);
  });

  it("al empezar asocia la tarea elegida y la muestra durante la sesión", async () => {
    const task = await seed("Leer capítulo 4");
    render(<FocusPanel />);
    fireEvent.change(await screen.findByLabelText("Tarea (opcional)"), {
      target: { value: task.id },
    });
    fireEvent.click(screen.getByRole("button", { name: "Empezar a estudiar" }));
    expect(await screen.findByText(/Tarea: Leer capítulo 4/)).toBeTruthy();
    expect(
      api.calls.find((c) => c.url === "/api/focus-sessions" && c.method === "POST")!.body,
    ).toEqual({
      taskId: task.id,
    });
  });

  it("sin tareas, no muestra selector y sigue funcionando", async () => {
    render(<FocusPanel />);
    await screen.findByRole("button", { name: "Empezar a estudiar" });
    expect(screen.queryByLabelText("Tarea (opcional)")).toBeNull();
  });

  it("si las tareas no cargan, igual se puede estudiar", async () => {
    render(<FocusPanel />);
    api.failNext(0);
    expect(
      await screen.findByRole("button", { name: "Empezar a estudiar" }),
    ).toBeTruthy();
  });
});

describe("DashboardView: próxima tarea", () => {
  it("sugiere la más urgente y enlaza a Tareas", async () => {
    await seed("Baja", { priority: "low" });
    await seed("Examen", { priority: "high" });
    render(<DashboardView />);
    expect(await screen.findByText("Examen")).toBeTruthy();
    expect(screen.getByText(/Próxima tarea/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Ver tareas/ }).getAttribute("href")).toBe(
      "/tasks",
    );
  });

  it("sin pendientes invita a crear una", async () => {
    render(<DashboardView />);
    expect(await screen.findByText(/No tenés tareas pendientes/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Crear una tarea/ }).getAttribute("href"),
    ).toBe("/tasks");
  });
});

describe("HistoryView: nombres de tareas", () => {
  async function studyOn(taskId: string) {
    const { session } = await ctx.service.start("u", { taskId });
    ctx.advance(30);
    await ctx.service.heartbeat("u", session!.id, `k-${taskId}-0001`);
    await ctx.service.finish("u", session!.id, "abandoned");
  }

  it("muestra el título de la tarea en vez de su id", async () => {
    const task = await seed("Química orgánica");
    await studyOn(task.id);
    render(<HistoryView />);
    expect(await screen.findByText("Química orgánica")).toBeTruthy();
  });

  it("una tarea eliminada se muestra como «Tarea eliminada»", async () => {
    const task = await seed("Temporal");
    await studyOn(task.id);
    await ctx.tasks.remove("u", task.id);
    render(<HistoryView />);
    expect(await screen.findByText("Tarea eliminada")).toBeTruthy();
  });
});
