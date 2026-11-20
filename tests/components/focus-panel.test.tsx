// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestService, installFakeApi, type FakeApi } from "../helpers/fake-api";

let search = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => search,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
const chime = vi.fn();
vi.mock("@/lib/utils/chime", () => ({ playChime: () => chime() }));

const { FocusPanel } = await import("@/features/focus-tracking/focus-panel");

let ctx: ReturnType<typeof createTestService>;
let api: FakeApi;

beforeEach(async () => {
  search = new URLSearchParams();
  chime.mockClear();
  ctx = createTestService();
  api = installFakeApi(ctx);
  // Por defecto sin descanso automático: cada test que lo necesite lo activa.
  await ctx.settings.updateSettings("u", { autoStartBreak: false });
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  Object.defineProperty(navigator, "sendBeacon", {
    value: () => true,
    configurable: true,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

/** Acredita `seconds` en la sesión con heartbeats cada 15 s, como el cliente real. */
async function credit(sessionId: string, seconds: number) {
  for (let i = 0; i < Math.ceil(seconds / 15); i++) {
    ctx.advance(15);
    await ctx.service.heartbeat("u", sessionId, `pre-${sessionId}-${i}`);
  }
}
async function startOnServer(over: { taskId?: string; mode?: "focus" } = {}) {
  const { session } = await ctx.service.start("u", over);
  return session!;
}
const seedTask = (title: string, over: Record<string, unknown> = {}) =>
  ctx.tasks.create("u", {
    title,
    description: null,
    subject: "quimica",
    estimatedPomodoros: 3,
    priority: "medium",
    dueAt: null,
    ...over,
  });
const starts = () =>
  api.calls.filter((c) => c.url === "/api/focus-sessions" && c.method === "POST");
const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole("button", { name }));

describe("Foco en reposo", () => {
  it("muestra cabecera, planta en semilla, tiempo y pista para empezar", async () => {
    await ctx.settings.updateSettings("u", { displayName: "Vale" });
    render(<FocusPanel />);
    expect(await screen.findByRole("heading", { name: "Concentración" })).toBeTruthy();
    expect(screen.getByText("¡A por ello, Vale!")).toBeTruthy();
    expect(screen.getByLabelText("Pomodoro 1 de 4").textContent).toBe("1/4");
    expect(screen.getByRole("link", { name: "Ajustes" }).getAttribute("href")).toBe(
      "/settings",
    );
    expect(screen.getByText("25:00")).toBeTruthy();
    expect(screen.getByText("Pulsa empezar para plantar tu semilla")).toBeTruthy();
    expect(screen.getByTestId("stage-pill").textContent).toBe("Semilla");
    expect(screen.getByRole("button", { name: "Empezar" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Rendirse" })).toBeNull();
    expect(screen.getByText(/No es una medida de atención real/)).toBeTruthy();
  });

  it("sin nombre, saluda sin nombre", async () => {
    render(<FocusPanel />);
    expect(await screen.findByText("¡A por ello!")).toBeTruthy();
  });

  it("el camino de etapas marca la semilla como actual", async () => {
    render(<FocusPanel />);
    const path = await screen.findByRole("list", { name: "Etapas de la planta" });
    const steps = within(path).getAllByRole("listitem");
    expect(steps).toHaveLength(6);
    expect(steps[0].getAttribute("aria-current")).toBe("step");
    expect(steps[0].getAttribute("aria-label")).toBe("Semilla (actual)");
    expect(steps[1].getAttribute("aria-label")).toBe("Brote (pendiente)");
  });

  it("si no se puede cargar el estado, muestra un error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { message: "caído" } }), { status: 500 }),
      ),
    );
    render(<FocusPanel />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/caído/);
  });
});

describe("Foco corriendo", () => {
  it("empezar cambia el saludo, ofrece pausar y rendirse", async () => {
    render(<FocusPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Empezar" }));
    expect(await screen.findByText("Concentración a tope")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pausar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Rendirse" })).toBeTruthy();
    expect(screen.getByText("Brote en 05:00")).toBeTruthy();
    expect(
      screen.getByRole("status", { name: "Estado de la sesión" }).textContent,
    ).toMatch(/Contando tiempo/);
  });

  it("la planta crece con el tiempo de la sesión", async () => {
    const s = await startOnServer();
    await credit(s.id, 300);
    render(<FocusPanel />);
    expect(await screen.findByText("Plántula en 05:00")).toBeTruthy();
    expect(screen.getByTestId("stage-pill").textContent).toBe("Brote");
    const steps = within(
      screen.getByRole("list", { name: "Etapas de la planta" }),
    ).getAllByRole("listitem");
    expect(steps[0].getAttribute("aria-label")).toBe("Semilla (completada)");
    expect(steps[1].getAttribute("aria-current")).toBe("step");
  });

  it("en la última etapa avisa que florece al terminar", async () => {
    const s = await startOnServer();
    await credit(s.id, 1200);
    render(<FocusPanel />);
    expect(await screen.findByText("Florece al terminar")).toBeTruthy();
    expect(screen.getByTestId("stage-pill").textContent).toBe("Arbusto");
  });

  it("pausar y seguir", async () => {
    render(<FocusPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Empezar" }));
    fireEvent.click(await screen.findByRole("button", { name: "Pausar" }));
    expect(await screen.findByText("En pausa — tu planta te espera")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Seguir" }));
    expect(await screen.findByRole("button", { name: "Pausar" })).toBeTruthy();
  });

  it("sin conexión no se puede empezar y se avisa", async () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    try {
      render(<FocusPanel />);
      const start = (await screen.findByRole("button", {
        name: "Empezar",
      })) as HTMLButtonElement;
      expect(start.disabled).toBe(true);
      expect(screen.getByRole("alert").textContent).toMatch(/sin conexión/i);
    } finally {
      Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
    }
  });
});

describe("Rendirse", () => {
  async function openDialog() {
    const s = await startOnServer();
    await credit(s.id, 300); // Brote
    render(<FocusPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Rendirse" }));
    return screen.findByRole("dialog", { name: "¿Rendirte ahora?" });
  }

  it("pausa el temporizador y explica qué se pierde", async () => {
    const dialog = await openDialog();
    expect(
      within(dialog).getByText(
        "Tu brote no llegará a florecer y no irá al jardín. Lo que estudiaste sigue contando para ti.",
      ),
    ).toBeTruthy();
    await waitFor(() =>
      expect(api.calls.some((c) => c.url.endsWith("/pause"))).toBe(true),
    );
  });

  it("«Seguir estudiando» reanuda y cierra el diálogo", async () => {
    await openDialog();
    await waitFor(() =>
      expect(screen.getByText("En pausa — tu planta te espera")).toBeTruthy(),
    );
    click("Seguir estudiando");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(await screen.findByRole("button", { name: "Pausar" })).toBeTruthy();
    expect(api.calls.some((c) => c.url.endsWith("/resume"))).toBe(true);
  });

  it("«Sí, terminar» cierra la sesión como abandonada y vuelve a la semilla", async () => {
    await openDialog();
    click("Sí, terminar");
    expect(await screen.findByRole("button", { name: "Empezar" })).toBeTruthy();
    const complete = api.calls.find((c) => c.url.endsWith("/complete"))!;
    expect(complete.body).toEqual({ outcome: "abandoned" });
    expect(screen.getByRole("heading", { name: "Concentración" })).toBeTruthy();
    expect(screen.getByTestId("stage-pill").textContent).toBe("Semilla");
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("Descanso", () => {
  async function completeFocus(taskId?: string) {
    const s = await startOnServer(taskId ? { taskId } : {});
    await credit(s.id, 1500);
  }

  it("tras un foco completado, muestra el descanso con la planta florecida", async () => {
    await completeFocus();
    render(<FocusPanel />);
    expect(await screen.findByRole("heading", { name: "Descanso corto" })).toBeTruthy();
    expect(screen.getByText("¡Floreció! Bien hecho")).toBeTruthy();
    expect(screen.getByText("Levántate, estira la espalda y bebe agua.")).toBeTruthy();
    expect(screen.getByTestId("stage-pill").textContent).toBe("Florecida");
    expect(screen.queryByRole("list", { name: "Etapas de la planta" })).toBeNull();
    expect(screen.queryByRole("button", { name: /cambiar/ })).toBeNull();
    expect(screen.getByText("05:00")).toBeTruthy();
    expect(screen.getByLabelText("Pomodoro 1 de 4")).toBeTruthy();
  });

  it("el descanso largo tiene su consejo", async () => {
    await ctx.settings.updateSettings("u", { longBreakInterval: 2 });
    await completeFocus();
    const s2 = await startOnServer({ mode: "focus" });
    await credit(s2.id, 1500);
    render(<FocusPanel />);
    expect(await screen.findByRole("heading", { name: "Descanso largo" })).toBeTruthy();
    expect(
      screen.getByText("Descanso largo: sal a caminar o come algo rico."),
    ).toBeTruthy();
  });

  it("empezar el descanso no lleva tarea y se puede saltar sin confirmar", async () => {
    const task = await seedTask("Leer");
    search = new URLSearchParams({ task: task.id });
    await completeFocus(task.id);
    render(<FocusPanel />);
    fireEvent.click(await screen.findByRole("button", { name: "Empezar" }));
    const skip = await screen.findByRole("button", { name: "Saltar descanso" });
    expect(starts().at(-1)!.body).toEqual({});
    fireEvent.click(skip);
    expect(await screen.findByRole("heading", { name: "Concentración" })).toBeTruthy();
    expect(api.calls.find((c) => c.url.endsWith("/complete"))!.body).toEqual({
      outcome: "abandoned",
    });
  });
});

describe("Al terminar el foco en pantalla", () => {
  async function finishWhileWatching(taskId?: string) {
    vi.useFakeTimers({
      toFake: ["setInterval", "clearInterval", "setTimeout", "clearTimeout"],
    });
    const s = await startOnServer(taskId ? { taskId } : {});
    await credit(s.id, 1485);
    render(<FocusPanel />);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("Florece al terminar")).toBeTruthy();
    await act(async () => {
      ctx.advance(15);
      await vi.advanceTimersByTimeAsync(15_000);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
  }

  it("el pomodoro completado se suma a la tarea sin recargar la página", async () => {
    const task = await seedTask("Leer");
    search = new URLSearchParams({ task: task.id });
    await finishWhileWatching(task.id);
    // Empezar y saltar el descanso para volver a la tarjeta de tarea.
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Empezar" }));
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Saltar descanso" }));
      await vi.advanceTimersByTimeAsync(0);
    });
    const card = screen.getByRole("button", { name: /cambiar/ });
    expect(within(card).getByText("Química · 1 de 3 pomodoros")).toBeTruthy();
  });

  it("con descanso automático, el descanso arranca solo y suena", async () => {
    await ctx.settings.updateSettings("u", { autoStartBreak: true, sound: true });
    await finishWhileWatching();
    expect(screen.getByRole("heading", { name: "Descanso corto" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Pausar" })).toBeTruthy();
    expect(starts()).toHaveLength(1); // el foco se creó en el servidor; este es el descanso
    expect(starts()[0].body).toEqual({});
    expect(chime).toHaveBeenCalledTimes(1);
  });

  it("sin descanso automático ni sonido, espera a que el usuario empiece", async () => {
    await ctx.settings.updateSettings("u", { autoStartBreak: false, sound: false });
    await finishWhileWatching();
    expect(screen.getByRole("heading", { name: "Descanso corto" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Empezar" })).toBeTruthy();
    expect(starts()).toHaveLength(0);
    expect(chime).not.toHaveBeenCalled();
  });
});

describe("Tarea del pomodoro", () => {
  it("sin tarea elegida ofrece una sesión libre", async () => {
    render(<FocusPanel />);
    const card = await screen.findByRole("button", { name: /cambiar/ });
    expect(within(card).getByText("Sesión libre, sin tarea")).toBeTruthy();
  });

  it("toma la tarea de ?task= y la envía al empezar", async () => {
    const task = await seedTask("Enlaces covalentes");
    search = new URLSearchParams({ task: task.id });
    render(<FocusPanel />);
    const card = await screen.findByRole("button", { name: /cambiar/ });
    expect(within(card).getByText("Enlaces covalentes")).toBeTruthy();
    expect(within(card).getByText("Química · 0 de 3 pomodoros")).toBeTruthy();
    click("Empezar");
    await waitFor(() => expect(starts()).toHaveLength(1));
    expect(starts()[0].body).toEqual({ taskId: task.id });
  });

  it("durante la sesión muestra la tarea pero no deja cambiarla", async () => {
    const task = await seedTask("Leer");
    await startOnServer({ taskId: task.id });
    render(<FocusPanel />);
    expect(await screen.findByText("Leer")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /cambiar/ })).toBeNull();
  });

  it("el selector lista las pendientes y permite elegir o ir sin tarea", async () => {
    await seedTask("Pendiente");
    const hecha = await seedTask("Hecha");
    await ctx.tasks.update("u", hecha.id, { status: "done" });
    render(<FocusPanel />);
    fireEvent.click(await screen.findByRole("button", { name: /cambiar/ }));
    const picker = await screen.findByRole("dialog", { name: "¿En qué vas a trabajar?" });
    expect(within(picker).queryByText("Hecha")).toBeNull();
    fireEvent.click(within(picker).getByRole("button", { name: /Pendiente/ }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      within(screen.getByRole("button", { name: /cambiar/ })).getByText("Pendiente"),
    ).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /cambiar/ }));
    const again = await screen.findByRole("dialog", { name: "¿En qué vas a trabajar?" });
    expect(
      within(again)
        .getByRole("button", { name: /Pendiente/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(
      within(again).getByRole("button", { name: "Sesión libre, sin tarea" }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByText("Sesión libre, sin tarea")).toBeTruthy();
  });

  it("«+ Nueva tarea» crea una tarea y la deja elegida", async () => {
    render(<FocusPanel />);
    fireEvent.click(await screen.findByRole("button", { name: /cambiar/ }));
    fireEvent.click(await screen.findByRole("button", { name: "+ Nueva tarea" }));
    const sheet = screen.getByRole("dialog", { name: "Nueva tarea" });
    fireEvent.change(within(sheet).getByLabelText("Título"), {
      target: { value: "Ensayo" },
    });
    fireEvent.click(within(sheet).getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(
      within(screen.getByRole("button", { name: /cambiar/ })).getByText("Ensayo"),
    ).toBeTruthy();
  });

  it("tocar fuera del selector lo cierra", async () => {
    render(<FocusPanel />);
    fireEvent.click(await screen.findByRole("button", { name: /cambiar/ }));
    fireEvent.click(await screen.findByTestId("picker-overlay"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
