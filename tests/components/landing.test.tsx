// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LoginCard } from "@/features/auth/login-card";
import { LandingPage } from "@/features/landing/landing-page";
import { MiniFocusDemo } from "@/features/landing/mini-focus-demo";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

let visibility: "visible" | "hidden";
let focused: boolean;

const fire = (target: EventTarget, type: string) =>
  act(async () => {
    target.dispatchEvent(new Event(type, { bubbles: true }));
  });
const advance = (ms: number) =>
  act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
const click = (name: string | RegExp) =>
  act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
const timer = () => screen.getByRole("timer").textContent;

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "setInterval",
      "clearInterval",
      "Date",
      "performance",
    ],
  });
  visibility = "visible";
  focused = true;
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => visibility,
  });
  vi.spyOn(document, "hasFocus").mockImplementation(() => focused);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("MiniFocusDemo", () => {
  it("se encuentra como región con nombre y muestra el temporizador y la planta", () => {
    render(<MiniFocusDemo />);
    expect(screen.getByRole("region", { name: /Probá un mini Pomodoro/ })).toBeTruthy();
    expect(timer()).toBe("01:00");
    expect(screen.getByRole("img", { name: /Brote/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Empezar mini-foco" })).toBeTruthy();
  });

  it("al empezar corre el tiempo y la planta crece", async () => {
    render(<MiniFocusDemo />);
    await click("Empezar mini-foco");
    await advance(10_000);
    expect(timer()).toBe("00:50");
    await advance(20_000);
    expect(timer()).toBe("00:30");
    expect(screen.getByRole("img", { name: /Planta joven/ })).toBeTruthy(); // 50 % → etapa 3
  });

  it("pausar detiene el tiempo y reanudar lo continúa", async () => {
    render(<MiniFocusDemo />);
    await click("Empezar mini-foco");
    await advance(5_000);
    await click("Pausar");
    await advance(20_000);
    expect(timer()).toBe("00:55");
    await click("Reanudar");
    await advance(5_000);
    expect(timer()).toBe("00:50");
  });

  it("si sales de la pestaña se pausa y lo explica (igual que la app real)", async () => {
    render(<MiniFocusDemo />);
    await click("Empezar mini-foco");
    await advance(5_000);
    visibility = "hidden";
    await fire(document, "visibilitychange");
    expect(screen.getByRole("button", { name: "Reanudar" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/saliste de la pestaña/);
    await advance(30_000);
    expect(timer()).toBe("00:55");
  });

  it("también se pausa si la ventana pierde el foco", async () => {
    render(<MiniFocusDemo />);
    await click("Empezar mini-foco");
    focused = false;
    await fire(window, "blur");
    expect(screen.getByRole("button", { name: "Reanudar" })).toBeTruthy();
  });

  it("al terminar la planta florece y se invita a crear la cuenta", async () => {
    render(<MiniFocusDemo />);
    await click("Empezar mini-foco");
    await advance(61_000);
    expect(timer()).toBe("00:00");
    expect(screen.getByRole("img", { name: /Florecida/ })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/Listo/);
    const cta = screen.getByRole("link", { name: /Crear mi cuenta/ });
    expect(cta.getAttribute("href")).toBe("/login");
  });

  it("aclara que es una demo acelerada que no guarda nada", () => {
    render(<MiniFocusDemo />);
    expect(screen.getByText(/demo acelerada/i)).toBeTruthy();
    expect(screen.getByText(/no se guarda/i)).toBeTruthy();
  });

  it("reiniciar vuelve a empezar", async () => {
    render(<MiniFocusDemo />);
    await click("Empezar mini-foco");
    await advance(10_000);
    await click("Reiniciar");
    expect(timer()).toBe("01:00");
    expect(screen.getByRole("button", { name: "Empezar mini-foco" })).toBeTruthy();
  });

  it("no llama al servidor: es solo local", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    render(<MiniFocusDemo />);
    await click("Empezar mini-foco");
    await advance(61_000);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

describe("LandingPage", () => {
  it("tiene un único título principal que promete lo esencial", () => {
    render(<LandingPage />);
    const h1 = screen.getAllByRole("heading", { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0].textContent).toMatch(/planta/i);
  });

  it("el Pomodoro con la planta es lo primero: está en la portada, antes de cualquier otra sección", () => {
    render(<LandingPage />);
    const demo = screen.getByRole("region", { name: /Probá un mini Pomodoro/ });
    const hero = demo.closest("[data-section='hero']");
    expect(hero).not.toBeNull();
    const firstSection = document.querySelector("main > section");
    expect(firstSection).toBe(hero);
    const howItWorks = screen.getByRole("heading", { name: /Así funciona/ });
    expect(
      demo.compareDocumentPosition(howItWorks) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("invita a crear la cuenta en la portada y al final, siempre hacia /login", () => {
    render(<LandingPage />);
    const ctas = screen.getAllByRole("link", { name: /Crear mi cuenta gratis/ });
    expect(ctas.length).toBeGreaterThanOrEqual(2);
    for (const a of ctas) expect(a.getAttribute("href")).toBe("/login");
    const hero = document.querySelector("[data-section='hero']")!;
    expect(
      within(hero as HTMLElement).getAllByRole("link", {
        name: /Crear mi cuenta gratis/,
      }),
    ).toHaveLength(1);
  });

  it("muestra las 6 etapas de la planta con sus minutos reales", () => {
    render(<LandingPage />);
    const section = screen.getByRole("region", { name: /Tu planta crece con vos/ });
    const items = within(section).getAllByRole("listitem");
    expect(items).toHaveLength(6);
    expect(within(section).getByText("Florecida")).toBeTruthy();
    expect(within(items[5]).getByText("180 min")).toBeTruthy();
  });

  it("es honesta sobre cómo se cuenta el tiempo", () => {
    render(<LandingPage />);
    expect(screen.getByText(/app abierta, visible y en primer plano/i)).toBeTruthy();
    expect(screen.getByText(/no mide tu atención/i)).toBeTruthy();
  });

  it("no promete cosas que no existen (sin testimonios ni cifras inventadas)", () => {
    render(<LandingPage />);
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/\d+\s*(mil|k)?\s*(usuarios|estudiantes|personas)/i);
    expect(text).not.toMatch(/testimonio|★|⭐/i);
  });

  it("ofrece una forma de entrar si ya tienes cuenta", () => {
    render(<LandingPage />);
    expect(screen.getByRole("link", { name: "Entrar" }).getAttribute("href")).toBe(
      "/login",
    );
  });
});

describe("LoginCard", () => {
  it("el acceso con Google está deshabilitado y lo dice con claridad", () => {
    render(<LoginCard />);
    const google = screen.getByRole("button", {
      name: /Continuar con Google/,
    }) as HTMLButtonElement;
    expect(google.disabled).toBe(true);
    expect(screen.getByText(/se activa en la próxima etapa/i)).toBeTruthy();
  });

  it("deja probar la app sin cuenta y avisa que el progreso no es permanente", () => {
    render(<LoginCard />);
    expect(
      screen.getByRole("link", { name: /Probar la app sin cuenta/ }).getAttribute("href"),
    ).toBe("/dashboard");
    expect(screen.getByText(/no se guarda de forma permanente/i)).toBeTruthy();
  });

  it("permite volver a la portada", () => {
    render(<LoginCard />);
    expect(screen.getByRole("link", { name: /Volver/ }).getAttribute("href")).toBe("/");
  });
});
