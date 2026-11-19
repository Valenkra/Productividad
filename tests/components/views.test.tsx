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
import { FocusPanel } from "@/features/focus-tracking/focus-panel";
import { GardenView } from "@/features/garden/garden-view";
import { STAGE_NAMES } from "@/features/garden/growth";
import { PlantIllustration } from "@/features/garden/plant-illustration";
import { DashboardView } from "@/features/history/dashboard-view";
import { HistoryView } from "@/features/history/history-view";
import type { StatsResponse } from "@/features/history/use-stats";
import { DEFAULT_USER_SETTINGS } from "@/features/settings/schema";
import { SettingsForm } from "@/features/settings/settings-form";
import { createTestService, installFakeApi } from "../helpers/fake-api";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/focus" }));

const { AppNav } = await import("@/components/layout/app-nav");

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function stubRoutes(routes: Record<string, (init?: RequestInit) => Response>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = Object.keys(routes).find((k) => url.startsWith(k));
    if (!key) return json({ error: { message: "sin ruta" } }, 404);
    return routes[key](init);
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const statsFixture = (over: Partial<StatsResponse> = {}) => ({
  timeZone: "UTC",
  today: {
    date: "2026-03-10",
    focusSeconds: 0,
    sessions: 0,
    goalSeconds: 3600,
    goalProgress: 0,
  },
  days: Array.from({ length: 14 }, (_, i) => ({
    date: `2026-03-${String(i + 1).padStart(2, "0")}`,
    focusSeconds: 0,
  })),
  weekFocusSeconds: 0,
  totalFocusSeconds: 0,
  streakDays: 0,
  perTask: [],
  recentSessions: [],
  plantTotalSeconds: 0,
  ...over,
});

describe("PlantIllustration", () => {
  it.each(STAGE_NAMES.map((name, i) => [i, name] as const))(
    "etapa %s se anuncia como «%s»",
    (stage, name) => {
      render(<PlantIllustration stage={stage} />);
      expect(screen.getByRole("img", { name: `Planta en etapa ${name}` })).toBeTruthy();
    },
  );

  it("limita etapas fuera de rango", () => {
    render(<PlantIllustration stage={99} />);
    expect(screen.getByRole("img", { name: /Florecida/ })).toBeTruthy();
    cleanup();
    render(<PlantIllustration stage={-3} />);
    expect(screen.getByRole("img", { name: /Semilla/ })).toBeTruthy();
  });

  it("solo se balancea mientras crece", () => {
    const { container, rerender } = render(<PlantIllustration stage={2} />);
    expect(container.querySelector(".plant-sway")).toBeNull();
    rerender(<PlantIllustration stage={2} growing />);
    expect(container.querySelector(".plant-sway")).not.toBeNull();
  });

  it("cada etapa dibuja más elementos que la anterior", () => {
    const counts = STAGE_NAMES.map((_, i) => {
      const { container } = render(<PlantIllustration stage={i} />);
      const n = container.querySelectorAll("ellipse, path, circle").length;
      cleanup();
      return n;
    });
    for (let i = 1; i < counts.length; i++)
      expect(counts[i]).toBeGreaterThanOrEqual(counts[i - 1]);
  });
});

describe("AppNav", () => {
  it("lista todas las secciones y marca la actual", () => {
    render(<AppNav />);
    const nav = screen.getByRole("navigation", { name: "Principal" });
    expect(within(nav).getAllByRole("link")).toHaveLength(6);
    expect(screen.getByRole("link", { name: "Foco" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Tareas" }).getAttribute("aria-current"),
    ).toBeNull();
  });
});

describe("FocusPanel", () => {
  let ctx: ReturnType<typeof createTestService>;
  beforeEach(() => {
    ctx = createTestService();
    installFakeApi(ctx.service);
    vi.spyOn(document, "hasFocus").mockReturnValue(true);
    Object.defineProperty(navigator, "sendBeacon", {
      value: () => true,
      configurable: true,
    });
  });

  it("ofrece empezar, con la duración que dicta el servidor", async () => {
    render(<FocusPanel />);
    expect(
      await screen.findByRole("button", { name: "Empezar a estudiar" }),
    ).toBeTruthy();
    expect(screen.getByText("25:00")).toBeTruthy();
    expect(screen.getByText("Concentración")).toBeTruthy();
  });

  it("iniciar muestra el temporizador contando y los controles", async () => {
    render(<FocusPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Empezar a estudiar" }));
    expect(await screen.findByText(/Contando tiempo/)).toBeTruthy();
    for (const name of ["Pausar", "Saltar", "Terminar"]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
  });

  it("pausar cambia el estado, y reanudar vuelve a contar", async () => {
    render(<FocusPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Empezar a estudiar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Pausar" }));
    expect(await screen.findByText(/Pausada: no se está contando tiempo/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reanudar" }));
    expect(await screen.findByText(/Contando tiempo/)).toBeTruthy();
  });

  it("saltar pide confirmación: cancelar no hace nada, aceptar cierra la fase", async () => {
    render(<FocusPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Empezar a estudiar" }));
    const skip = await screen.findByRole("button", { name: "Saltar" });

    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(skip);
    expect(confirm).toHaveBeenCalled();
    expect(screen.queryByText("Fase terminada")).toBeNull();

    confirm.mockReturnValue(true);
    fireEvent.click(skip);
    expect(await screen.findByText("Fase terminada")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Siguiente: Concentración/ })).toBeTruthy();
  });

  it("explica la limitación: no mide atención real", async () => {
    render(<FocusPanel />);
    expect(await screen.findByText(/No es una medida de atención real/)).toBeTruthy();
  });

  it("muestra la etapa de la planta según el crecimiento acumulado", async () => {
    const { session } = await ctx.service.start("u", {});
    for (let i = 0; i < 25; i++) {
      ctx.advance(30);
      await ctx.service.heartbeat("u", session!.id, `acum-${i}-xxxx`);
    }
    await ctx.service.finish("u", session!.id, "abandoned"); // 750 s = 12 min → Brote
    render(<FocusPanel />);
    expect(await screen.findByText(/Brote · 12 min/)).toBeTruthy();
  });

  it("si no se puede cargar el estado, muestra un error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => json({ error: { message: "caído" } }, 500)),
    );
    render(<FocusPanel />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/caído/);
  });
});

describe("GardenView", () => {
  it("jardín vacío: semilla, mensaje y progreso 0%", async () => {
    stubRoutes({ "/api/garden": () => json({ plantTotalSeconds: 0 }) });
    render(<GardenView />);
    expect(await screen.findByText("Semilla", { selector: "p" })).toBeTruthy();
    expect(screen.getByText(/Todavía no hay crecimiento/)).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
  });

  it("progreso hacia la siguiente etapa", async () => {
    stubRoutes({ "/api/garden": () => json({ plantTotalSeconds: 150 }) }); // 2,5 de 5 min
    render(<GardenView />);
    expect(await screen.findByText(/Faltan 3 min para «Brote»/)).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("50");
  });

  it("etapa máxima: sin barra de progreso", async () => {
    stubRoutes({ "/api/garden": () => json({ plantTotalSeconds: 60 * 200 }) });
    render(<GardenView />);
    expect(await screen.findByText(/máximo esplendor/)).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("error de carga", async () => {
    stubRoutes({ "/api/garden": () => json({}, 500) });
    render(<GardenView />);
    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});

describe("DashboardView", () => {
  it("estado vacío invita a empezar", async () => {
    stubRoutes({ "/api/stats": () => json(statsFixture()) });
    render(<DashboardView />);
    expect(await screen.findByText(/Todavía no acumulaste tiempo/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "Empezar a estudiar" }).getAttribute("href"),
    ).toBe("/focus");
  });

  it("muestra hoy, meta, sesiones y racha", async () => {
    stubRoutes({
      "/api/stats": () =>
        json(
          statsFixture({
            today: {
              date: "2026-03-10",
              focusSeconds: 1800,
              sessions: 2,
              goalSeconds: 3600,
              goalProgress: 0.5,
            },
            totalFocusSeconds: 5000,
            streakDays: 3,
            plantTotalSeconds: 600,
          }),
        ),
    });
    render(<DashboardView />);
    expect(await screen.findByText("30 min")).toBeTruthy();
    expect(screen.getByText(/50% de tu meta de 1 h 00 min/)).toBeTruthy();
    expect(screen.getByText(/2 sesiones hoy · racha de 3 días/)).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("50");
    expect(screen.queryByText(/Todavía no acumulaste/)).toBeNull();
  });

  it("meta cumplida", async () => {
    stubRoutes({
      "/api/stats": () =>
        json(
          statsFixture({
            today: {
              date: "2026-03-10",
              focusSeconds: 4000,
              sessions: 1,
              goalSeconds: 3600,
              goalProgress: 1,
            },
            totalFocusSeconds: 4000,
          }),
        ),
    });
    render(<DashboardView />);
    expect(await screen.findByText("¡Meta diaria cumplida!")).toBeTruthy();
    expect(screen.getByText(/1 sesión hoy/)).toBeTruthy();
  });

  it("pide las estadísticas con la zona horaria del navegador", async () => {
    const fetchMock = stubRoutes({ "/api/stats": () => json(statsFixture()) });
    render(<DashboardView />);
    await screen.findByRole("link");
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/^\/api\/stats\?tz=/);
  });
});

describe("HistoryView", () => {
  it("estados vacíos", async () => {
    stubRoutes({ "/api/stats": () => json(statsFixture()) });
    render(<HistoryView />);
    expect(await screen.findByText(/Todavía no terminaste ninguna sesión/)).toBeTruthy();
    expect(screen.getByText(/no hay sesiones asociadas a tareas/)).toBeTruthy();
  });

  it("separa planificado de acreditado y rotula el estado", async () => {
    stubRoutes({
      "/api/stats": () =>
        json(
          statsFixture({
            weekFocusSeconds: 1200,
            totalFocusSeconds: 1200,
            perTask: [
              { taskId: "abcdef12-0000-4000-8000-000000000000", focusSeconds: 600 },
            ],
            recentSessions: [
              {
                id: "1",
                mode: "focus",
                status: "completed",
                taskId: null,
                startedAt: Date.UTC(2026, 2, 9, 12),
                plannedSeconds: 1500,
                creditedSeconds: 1500,
              },
              {
                id: "2",
                mode: "short_break",
                status: "abandoned",
                taskId: null,
                startedAt: Date.UTC(2026, 2, 9, 13),
                plannedSeconds: 300,
                creditedSeconds: 60,
              },
            ],
          }),
        ),
    });
    render(<HistoryView />);
    expect(
      await screen.findByText(/Planificado 25 min · Acreditado 25 min · Completada/),
    ).toBeTruthy();
    expect(
      screen.getByText(/Planificado 5 min · Acreditado 1 min · Interrumpida/),
    ).toBeTruthy();
    expect(screen.getByText("Tarea abcdef12")).toBeTruthy();
    expect(screen.getByText("Descanso corto")).toBeTruthy();
  });

  it("ofrece una tabla accesible con los 14 días", async () => {
    stubRoutes({ "/api/stats": () => json(statsFixture()) });
    render(<HistoryView />);
    const table = await screen.findByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(14);
  });
});

describe("SettingsForm", () => {
  it("carga los valores y guarda números válidos con PATCH", async () => {
    const fetchMock = stubRoutes({
      "/api/settings": (init) =>
        init?.method === "PATCH"
          ? json({ ...DEFAULT_USER_SETTINGS, focusMinutes: 40 })
          : json(DEFAULT_USER_SETTINGS),
    });
    render(<SettingsForm />);
    const input = (await screen.findByLabelText(
      "Concentración (min)",
    )) as HTMLInputElement;
    expect(input.value).toBe("25");
    fireEvent.change(input, { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText(/Guardado/)).toBeTruthy();
    const patch = fetchMock.mock.calls.find(([, init]) => init?.method === "PATCH")!;
    expect(JSON.parse(String(patch[1]!.body))).toMatchObject({
      focusMinutes: 40,
      dailyGoalMinutes: 60,
    });
  });

  it("valores fuera de rango no se envían", async () => {
    const fetchMock = stubRoutes({ "/api/settings": () => json(DEFAULT_USER_SETTINGS) });
    render(<SettingsForm />);
    fireEvent.change(await screen.findByLabelText("Meta diaria (min)"), {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/fuera de rango/);
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === "PATCH")).toBe(false);
  });

  it("informa si el servidor rechaza o no hay conexión", async () => {
    let mode: "reject" | "offline" = "reject";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        if (init?.method !== "PATCH") return json(DEFAULT_USER_SETTINGS);
        if (mode === "offline") throw new TypeError("Failed to fetch");
        return json({}, 500);
      }),
    );
    render(<SettingsForm />);
    const save = await screen.findByRole("button", { name: "Guardar" });
    fireEvent.click(save);
    expect((await screen.findByRole("alert")).textContent).toMatch(/No se pudo guardar/);
    mode = "offline";
    fireEvent.click(save);
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toMatch(/Sin conexión/),
    );
  });
});
