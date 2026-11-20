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
import { DEFAULT_USER_SETTINGS, type UserSettings } from "@/features/settings/schema";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const { SettingsForm } = await import("@/features/settings/settings-form");

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

type Call = { method: string; body: Record<string, unknown> | null };
let calls: Call[];
let patchResponse: (body: Record<string, unknown>) => Response | Promise<Response>;
let current: UserSettings;

beforeEach(() => {
  calls = [];
  push.mockClear();
  current = { ...DEFAULT_USER_SETTINGS };
  patchResponse = (body) => {
    current = { ...current, ...body };
    return json(current);
  };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (_url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const body = init?.body ? JSON.parse(String(init.body)) : null;
      calls.push({ method, body });
      return method === "PATCH" ? patchResponse(body) : json(current);
    }),
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const row = (name: string) => within(screen.getByRole("group", { name }));
const patches = () => calls.filter((c) => c.method === "PATCH").map((c) => c.body);

describe("SettingsForm (rediseño)", () => {
  it("muestra los tiempos en grupos y un botón de volver a Foco", async () => {
    render(<SettingsForm />);
    expect(await screen.findByRole("heading", { name: "Ajustes" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Tiempos" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Preferencias" })).toBeTruthy();
    expect(row("Concentración").getByText("25 min")).toBeTruthy();
    expect(row("Descanso corto").getByText("5 min")).toBeTruthy();
    expect(row("Descanso largo").getByText("15 min")).toBeTruthy();
    expect(row("Ciclo").getByText("4 focos")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Volver" }).getAttribute("href")).toBe(
      "/focus",
    );
  });

  it("los contadores avanzan con el paso de cada campo y guardan al instante", async () => {
    render(<SettingsForm />);
    await screen.findByRole("heading", { name: "Ajustes" });
    fireEvent.click(row("Concentración").getByRole("button", { name: "Aumentar" }));
    fireEvent.click(row("Descanso corto").getByRole("button", { name: "Aumentar" }));
    fireEvent.click(row("Descanso largo").getByRole("button", { name: "Disminuir" }));
    fireEvent.click(row("Ciclo").getByRole("button", { name: "Aumentar" }));
    await waitFor(() => expect(patches()).toHaveLength(4));
    expect(patches()).toEqual([
      { focusMinutes: 30 },
      { shortBreakMinutes: 6 },
      { longBreakMinutes: 10 },
      { longBreakInterval: 5 },
    ]);
    expect(row("Concentración").getByText("30 min")).toBeTruthy();
  });

  it("respeta los límites de cada contador", async () => {
    current = { ...current, focusMinutes: 5, longBreakInterval: 12 };
    render(<SettingsForm />);
    await screen.findByRole("heading", { name: "Ajustes" });
    const dec = row("Concentración").getByRole("button", {
      name: "Disminuir",
    }) as HTMLButtonElement;
    const inc = row("Ciclo").getByRole("button", {
      name: "Aumentar",
    }) as HTMLButtonElement;
    expect(dec.disabled).toBe(true);
    expect(inc.disabled).toBe(true);
  });

  it("los interruptores reflejan y guardan las preferencias", async () => {
    render(<SettingsForm />);
    const auto = await screen.findByRole("switch", {
      name: "Empezar descanso automáticamente",
    });
    const sound = screen.getByRole("switch", { name: "Sonido al terminar" });
    expect(auto.getAttribute("aria-checked")).toBe("true");
    expect(sound.getAttribute("aria-checked")).toBe("true");
    fireEvent.click(auto);
    await waitFor(() => expect(patches()).toEqual([{ autoStartBreak: false }]));
    expect(auto.getAttribute("aria-checked")).toBe("false");
  });

  it("si el servidor rechaza, revierte el valor y avisa", async () => {
    patchResponse = () => json({}, 500);
    render(<SettingsForm />);
    await screen.findByRole("heading", { name: "Ajustes" });
    fireEvent.click(row("Concentración").getByRole("button", { name: "Aumentar" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/No se pudo guardar/);
    expect(row("Concentración").getByText("25 min")).toBeTruthy();
  });

  it("sin conexión avisa y revierte", async () => {
    patchResponse = () => {
      throw new TypeError("Failed to fetch");
    };
    render(<SettingsForm />);
    await screen.findByRole("heading", { name: "Ajustes" });
    fireEvent.click(screen.getByRole("switch", { name: "Sonido al terminar" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/Sin conexión/);
    expect(
      screen
        .getByRole("switch", { name: "Sonido al terminar" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("«Ver la introducción otra vez» reabre el onboarding", async () => {
    render(<SettingsForm />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Ver la introducción otra vez" }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/onboarding"));
    expect(patches()).toEqual([{ onboardingDone: false }]);
  });
});
