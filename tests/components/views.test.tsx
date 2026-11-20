// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { STAGE_NAMES } from "@/features/garden/growth";
import { PlantIllustration } from "@/features/garden/plant-illustration";

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

  it("con fit recorta las etapas tempranas para llenar el marco", () => {
    const box = (stage: number, fit: boolean) => {
      const { container } = render(<PlantIllustration stage={stage} fit={fit} />);
      const [x, y, w, h] = container
        .querySelector("svg")!
        .getAttribute("viewBox")!
        .split(" ")
        .map(Number);
      cleanup();
      return { x, y, w, h };
    };
    expect(box(0, false)).toEqual({ x: 0, y: 0, w: 120, h: 140 });
    expect(box(5, true)).toEqual({ x: 0, y: 0, w: 120, h: 140 });
    const seed = box(0, true);
    expect(seed.w).toBeLessThan(120);
    // Mismo aspecto, anclado al borde inferior (maceta) y centrado en x.
    expect(seed.w / seed.h).toBeCloseTo(120 / 140);
    expect(seed.y + seed.h).toBeCloseTo(140);
    expect(seed.x + seed.w / 2).toBeCloseTo(60);
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
    expect(within(nav).getAllByRole("link")).toHaveLength(4);
    expect(screen.getByRole("link", { name: "Foco" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Tareas" }).getAttribute("aria-current"),
    ).toBeNull();
  });
});
