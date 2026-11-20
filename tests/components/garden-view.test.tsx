// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GardenView } from "@/features/garden/garden-view";
import { createTestService, installFakeApi } from "../helpers/fake-api";

let ctx: ReturnType<typeof createTestService>;

beforeEach(() => {
  ctx = createTestService();
  // El jardín agrupa por día respecto de "ahora": el reloj del navegador sigue al del servidor.
  vi.spyOn(Date, "now").mockImplementation(() => ctx.now());
  installFakeApi(ctx);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function completeFocus(taskId?: string) {
  const { session } = await ctx.service.start("u", { taskId, mode: "focus" });
  for (let i = 0; i < 101; i++) {
    ctx.advance(15);
    await ctx.service.heartbeat("u", session!.id, `g-${session!.id}-${i}`);
  }
}

describe("GardenView", () => {
  it("vacío: invita a completar el primer pomodoro", async () => {
    render(<GardenView />);
    expect(await screen.findByRole("heading", { name: "Jardín" })).toBeTruthy();
    expect(screen.getByText("0 plantas florecidas")).toBeTruthy();
    expect(screen.getByText(/Completa un pomodoro/)).toBeTruthy();
  });

  it("muestra una planta por foco completado, agrupadas por día con sus minutos", async () => {
    const task = await ctx.tasks.create("u", {
      title: "Derivadas parciales",
      description: null,
      subject: "calculo",
      estimatedPomodoros: 2,
      priority: "medium",
      dueAt: null,
    });
    await completeFocus(task.id);
    await completeFocus();
    // Un foco abandonado no florece.
    const { session } = await ctx.service.start("u", { mode: "focus" });
    ctx.advance(15);
    await ctx.service.heartbeat("u", session!.id, "abandonada-0001");
    await ctx.service.finish("u", session!.id, "abandoned");

    render(<GardenView />);
    expect(await screen.findByText("2 plantas florecidas")).toBeTruthy();
    const today = screen.getByRole("region", { name: "Hoy" });
    expect(within(today).getByText("50 min")).toBeTruthy();
    const plants = within(today).getAllByRole("listitem");
    expect(plants).toHaveLength(2);
    expect(plants.map((p) => p.textContent)).toEqual([
      expect.stringContaining("Sesión libre"),
      expect.stringContaining("Derivadas parciales"),
    ]);
    expect(plants[1].getAttribute("aria-label")).toBe(
      "Derivadas parciales · Cálculo · 25 min",
    );
  });

  it("una sola planta usa el singular", async () => {
    await completeFocus();
    render(<GardenView />);
    expect(await screen.findByText("1 planta florecida")).toBeTruthy();
  });

  it("error de carga", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );
    render(<GardenView />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/No se pudo cargar/);
  });
});
