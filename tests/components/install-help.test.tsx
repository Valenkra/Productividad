// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InstallHelp } from "@/features/pwa/install-help";

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Version/17.4 Mobile/15E148 Safari/604.1";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36";
const DESKTOP =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";

function setup(ua: string, { standalone = false, touch = 0 } = {}) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(ua);
  // jsdom no define maxTouchPoints, así que no se puede espiar: se define a mano.
  Object.defineProperty(navigator, "maxTouchPoints", {
    value: touch,
    configurable: true,
  });
  vi.stubGlobal(
    "matchMedia",
    (q: string) =>
      ({
        matches: standalone && q.includes("standalone"),
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("InstallHelp", () => {
  it("iOS: pasos de Safari y advertencia de primer plano", () => {
    setup(IPHONE, { touch: 5 });
    render(<InstallHelp />);
    expect(screen.getByRole("heading", { name: /instalar la app/i })).toBeTruthy();
    expect(screen.getByText(/compartir/i)).toBeTruthy();
    expect(screen.getByText(/agregar a inicio/i)).toBeTruthy();
    expect(screen.getByText(/primer plano/i).textContent).toMatch(/pantalla bloqueada/i);
  });

  it("Android: pasos de Chrome", () => {
    setup(ANDROID, { touch: 5 });
    render(<InstallHelp />);
    expect(screen.getByText(/instalar app|agregar a la pantalla/i)).toBeTruthy();
    expect(screen.queryByText(/agregar a inicio/i)).toBeNull();
  });

  it("escritorio: indicación genérica", () => {
    setup(DESKTOP);
    render(<InstallHelp />);
    expect(screen.getByText(/barra de direcciones/i)).toBeTruthy();
  });

  it("ya instalada (standalone): no muestra la ayuda", () => {
    setup(IPHONE, { touch: 5, standalone: true });
    render(<InstallHelp />);
    expect(screen.queryByRole("heading", { name: /instalar la app/i })).toBeNull();
  });
});
