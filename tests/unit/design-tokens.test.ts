import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "@/components/layout/nav-items";

const css = readFileSync("src/app/globals.css", "utf8");
const layout = readFileSync("src/app/layout.tsx", "utf8");

/** Valor de `--nombre: valor;` dentro de globals.css. */
const token = (name: string) =>
  new RegExp(`--${name}:\s*([^;]+);`).exec(css)?.[1]?.trim();

describe("tokens del rediseño (paleta Suave)", () => {
  it.each([
    ["ink", "#4a3d55"],
    ["accent", "#e8846a"],
    ["accent-hover", "#ee9781"],
    ["mint", "#d6ebdd"],
    ["lilac", "#ebe5f7"],
    ["rest-bg", "#f3f0f8"],
    ["peach", "#f7e3da"],
    ["line", "#eddfd3"],
    ["danger", "#b5523b"],
    ["subject-calculo", "#f2c2b2"],
    ["subject-quimica", "#cfe6d7"],
    ["subject-historia", "#e0d9f5"],
    ["subject-ingles", "#f3e3b8"],
    ["prio-high", "#e8846a"],
    ["prio-medium", "#e9c16e"],
    ["prio-low", "#94c9a8"],
  ])("--%s = %s", (name, value) => {
    expect(token(name)).toBe(value);
  });

  it("la app interior usa fondo, tinta y muted de la paleta Suave", () => {
    const block = /\.app-theme\s*\{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(block).toContain("--background: #fbf5ee");
    expect(block).toContain("--foreground: #4a3d55");
    expect(block).toContain("--muted: #776a84");
    expect(block).toContain("var(--font-fredoka)");
  });

  it("expone los tokens como utilidades de Tailwind", () => {
    for (const c of ["ink", "accent", "mint", "lilac", "peach", "line", "danger"]) {
      expect(css).toContain(`--color-${c}: var(--${c})`);
    }
  });

  it("carga Fredoka con los pesos 400–700", () => {
    expect(layout).toMatch(/Fredoka\(\{[\s\S]*?variable: "--font-fredoka"/);
    expect(layout).toMatch(/weight:\s*\["400", "500", "600", "700"\]/);
  });
});

describe("pestañas del rediseño", () => {
  it("son Foco, Tareas, Jardín y Stats, en ese orden", () => {
    expect(NAV_ITEMS.map((i) => [i.href, i.label])).toEqual([
      ["/focus", "Foco"],
      ["/tasks", "Tareas"],
      ["/garden", "Jardín"],
      ["/history", "Stats"],
    ]);
  });
});
