// @vitest-environment jsdom
import { act, cleanup, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OfflineBanner } from "@/features/pwa/offline-banner";
import { SwRegister } from "@/features/pwa/sw-register";
import { useOnline } from "@/lib/utils/use-online";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function setOnline(value: boolean) {
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(value);
  window.dispatchEvent(new Event(value ? "online" : "offline"));
}

describe("useOnline", () => {
  beforeEach(() => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  });

  it("refleja los cambios de conexión", () => {
    const { result } = renderHook(() => useOnline());
    expect(result.current).toBe(true);
    act(() => setOnline(false));
    expect(result.current).toBe(false);
    act(() => setOnline(true));
    expect(result.current).toBe(true);
  });
});

describe("OfflineBanner", () => {
  it("no muestra nada con conexión", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    render(<OfflineBanner />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("avisa sin conexión que no se acredita tiempo", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    render(<OfflineBanner />);
    act(() => setOnline(false));
    const banner = screen.getByRole("status");
    expect(banner.textContent).toMatch(/sin conexión/i);
    expect(banner.textContent).toMatch(/no se acredita tiempo/i);
    act(() => setOnline(true));
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("SwRegister", () => {
  function stubServiceWorker(register: ReturnType<typeof vi.fn>) {
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register },
      configurable: true,
    });
  }
  afterEach(() => {
    Reflect.deleteProperty(navigator, "serviceWorker");
  });

  it("en producción registra /sw.js en la raíz sin usar la caché HTTP", () => {
    vi.stubEnv("NODE_ENV", "production");
    const register = vi.fn().mockResolvedValue({});
    stubServiceWorker(register);
    render(<SwRegister />);
    expect(register).toHaveBeenCalledWith("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  });

  it("en desarrollo no registra nada (evita cachés raras mientras se programa)", () => {
    vi.stubEnv("NODE_ENV", "development");
    const register = vi.fn().mockResolvedValue({});
    stubServiceWorker(register);
    render(<SwRegister />);
    expect(register).not.toHaveBeenCalled();
  });

  it("si el navegador no soporta service workers, no rompe", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(() => render(<SwRegister />)).not.toThrow();
  });

  it("si el registro falla, lo informa en consola y la app sigue", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    stubServiceWorker(vi.fn().mockRejectedValue(new Error("boom")));
    render(<SwRegister />);
    await vi.waitFor(() => expect(error).toHaveBeenCalled());
    expect(String(error.mock.calls[0]?.[0])).toMatch(/service worker/i);
  });
});
