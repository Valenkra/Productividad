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
import { createTestService, installFakeApi, type FakeApi } from "../helpers/fake-api";

const push = vi.fn();
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));

const { OnboardingFlow } = await import("@/features/onboarding/onboarding-flow");
const { OnboardingGate } = await import("@/features/onboarding/onboarding-gate");

let ctx: ReturnType<typeof createTestService>;
let api: FakeApi;

beforeEach(() => {
  push.mockClear();
  replace.mockClear();
  ctx = createTestService();
  api = installFakeApi(ctx.service, "u", ctx.tasks);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const next = () => fireEvent.click(screen.getByRole("button", { name: "Siguiente" }));
const steps = () =>
  within(screen.getByRole("list", { name: "Pasos" })).getAllByRole("listitem");
const patches = () => api.calls.filter((c) => c.method === "PATCH").map((c) => c.body);

describe("OnboardingFlow", () => {
  it("paso 1: presenta la idea y marca el primer paso", () => {
    render(<OnboardingFlow />);
    expect(
      screen.getByRole("heading", { name: "Estudia y haz crecer tu planta" }),
    ).toBeTruthy();
    expect(screen.getByText(/Cada pomodoro empieza con una semilla/)).toBeTruthy();
    expect(steps()).toHaveLength(3);
    expect(steps()[0].getAttribute("aria-current")).toBe("step");
  });

  it("paso 2: explica cómo funciona en tres tarjetas", () => {
    render(<OnboardingFlow />);
    next();
    expect(screen.getByRole("heading", { name: "Así funciona" })).toBeTruthy();
    for (const t of [
      "Elige una tarea",
      "Concéntrate 25 minutos",
      "Descansa y colecciona",
    ]) {
      expect(screen.getByText(t)).toBeTruthy();
    }
    expect(screen.getByText(/Si abandonas un pomodoro a medias/)).toBeTruthy();
    expect(steps()[1].getAttribute("aria-current")).toBe("step");
  });

  it("paso 3: guarda nombre y ritmo, marca el onboarding y lleva a Foco", async () => {
    render(<OnboardingFlow />);
    next();
    next();
    expect(screen.getByRole("heading", { name: "Último paso" })).toBeTruthy();
    expect(
      screen.getByRole("radio", { name: /Clásico/ }).getAttribute("aria-checked"),
    ).toBe("true");
    fireEvent.change(screen.getByLabelText("Tu nombre"), { target: { value: " Vale " } });
    fireEvent.click(screen.getByRole("radio", { name: /Profundo/ }));
    fireEvent.click(screen.getByRole("button", { name: "Empezar a estudiar" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/focus"));
    expect(patches()).toEqual([
      {
        displayName: "Vale",
        focusMinutes: 50,
        shortBreakMinutes: 10,
        longBreakMinutes: 20,
        onboardingDone: true,
      },
    ]);
    expect(await ctx.service.getSettings("u")).toMatchObject({
      displayName: "Vale",
      focusMinutes: 50,
      onboardingDone: true,
    });
  });

  it("el ritmo Ligero fija 15/3 con largo de 10", async () => {
    render(<OnboardingFlow />);
    next();
    next();
    fireEvent.click(screen.getByRole("radio", { name: /Ligero/ }));
    fireEvent.click(screen.getByRole("button", { name: "Empezar a estudiar" }));
    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(patches()[0]).toMatchObject({
      focusMinutes: 15,
      shortBreakMinutes: 3,
      longBreakMinutes: 10,
    });
  });

  it("«Saltar» marca el onboarding sin tocar los tiempos", async () => {
    render(<OnboardingFlow />);
    fireEvent.click(screen.getByRole("button", { name: "Saltar" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/focus"));
    expect(patches()).toEqual([{ onboardingDone: true }]);
  });

  it("si no se puede guardar, avisa y se queda", async () => {
    render(<OnboardingFlow />);
    next();
    next();
    api.failNext(1);
    fireEvent.click(screen.getByRole("button", { name: "Empezar a estudiar" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/No se pudo guardar/);
    expect(push).not.toHaveBeenCalled();
  });
});

describe("OnboardingGate", () => {
  it("manda al onboarding a quien no lo completó", async () => {
    render(
      <OnboardingGate>
        <p>contenido</p>
      </OnboardingGate>,
    );
    expect(screen.getByText("contenido")).toBeTruthy();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/onboarding"));
  });

  it("no redirige si ya lo completó o si los ajustes no cargan", async () => {
    await ctx.service.updateSettings("u", { onboardingDone: true });
    const { unmount } = render(
      <OnboardingGate>
        <p>contenido</p>
      </OnboardingGate>,
    );
    await waitFor(() => expect(api.calls.length).toBeGreaterThan(0));
    unmount();
    await ctx.service.updateSettings("u", { onboardingDone: false });
    api.failNext(1);
    render(
      <OnboardingGate>
        <p>contenido</p>
      </OnboardingGate>,
    );
    await waitFor(() => expect(api.calls.length).toBe(2));
    await new Promise((r) => setTimeout(r, 20));
    expect(replace).not.toHaveBeenCalled();
  });
});
