// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StatsView } from "@/features/history/stats-view";
import { createTestService, installFakeApi } from "../helpers/fake-api";

let ctx: ReturnType<typeof createTestService>;

beforeEach(() => {
  ctx = createTestService(); // martes 10 de marzo de 2026, 15:00 UTC
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
    await ctx.service.heartbeat("u", session!.id, `st-${session!.id}-${i}`);
  }
}
const task = (title: string, subject: "calculo" | "ingles" | null) =>
  ctx.tasks.create("u", {
    title,
    description: null,
    subject,
    estimatedPomodoros: 2,
    priority: "medium",
    dueAt: null,
  });
const tile = (label: string) =>
  screen.getByText(label, { selector: "p" }).parentElement as HTMLElement;

describe("StatsView", () => {
  it("vacío: ceros y sin materias", async () => {
    render(<StatsView />);
    expect(await screen.findByRole("heading", { name: "Estadísticas" })).toBeTruthy();
    expect(within(tile("min hoy")).getByText("0")).toBeTruthy();
    expect(within(tile("pomodoros")).getByText("0")).toBeTruthy();
    expect(within(tile("días de racha")).getByText("0")).toBeTruthy();
    expect(screen.getByText(/Todavía no hay minutos por materia/)).toBeTruthy();
  });

  it("muestra minutos de hoy, pomodoros, racha, la semana y las materias", async () => {
    const calc = await task("Derivadas", "calculo");
    const eng = await task("Essay", "ingles");
    await completeFocus(calc.id);
    await completeFocus(calc.id);
    await completeFocus(eng.id);
    render(<StatsView />);

    expect(await screen.findByRole("heading", { name: "Estadísticas" })).toBeTruthy();
    expect(within(tile("min hoy")).getByText("75")).toBeTruthy();
    expect(within(tile("pomodoros")).getByText("3")).toBeTruthy();
    expect(within(tile("días de racha")).getByText("1")).toBeTruthy();

    const week = screen.getByRole("list", { name: "Minutos por día" });
    const bars = within(week).getAllByRole("listitem");
    expect(bars).toHaveLength(7);
    const today = bars.find((b) => b.getAttribute("aria-current") === "date")!;
    expect(today.getAttribute("aria-label")).toBe("Hoy: 75 min");

    const subjects = within(screen.getByRole("list", { name: "Por materia" }))
      .getAllByRole("listitem")
      .map((li) => li.getAttribute("aria-label"));
    expect(subjects).toEqual(["Cálculo: 50 min", "Inglés: 25 min"]);
  });

  it("error de carga", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("{}", { status: 500 })),
    );
    render(<StatsView />);
    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
