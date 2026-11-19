import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { PWA } from "@/lib/pwa/config";

const css = readFileSync("src/app/globals.css", "utf8");
const cssVar = (name: string) =>
  new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`).exec(css)?.[1];

describe("manifest", () => {
  const m = manifest();

  it("identifica la app en español y se abre como app independiente", () => {
    expect(m.name).toBe("Focus Garden");
    expect(m.short_name).toBeTruthy();
    expect(m.short_name!.length).toBeLessThanOrEqual(12);
    expect(m.lang).toBe("es");
    expect(m.display).toBe("standalone");
    expect(m.description).toBeTruthy();
  });

  it("start_url y scope válidos dentro del mismo origen", () => {
    expect(m.start_url).toBe("/dashboard");
    expect(m.scope).toBe("/");
    expect(m.id).toBeTruthy();
  });

  it("los colores salen de la paleta de la app (no valores sueltos)", () => {
    expect(m.background_color?.toLowerCase()).toBe(cssVar("background")!.toLowerCase());
    expect(m.theme_color?.toLowerCase()).toBe(cssVar("leaf-strong")!.toLowerCase());
  });

  it("incluye íconos 192 y 512 (any) y 512 maskable, todos PNG bajo /icons/", () => {
    const icons = m.icons ?? [];
    const has = (sizes: string, purpose: string) =>
      icons.some((i) => i.sizes === sizes && (i.purpose ?? "any") === purpose);
    expect(has("192x192", "any")).toBe(true);
    expect(has("512x512", "any")).toBe(true);
    expect(has("512x512", "maskable")).toBe(true);
    for (const icon of icons) {
      expect(icon.src.startsWith("/icons/")).toBe(true);
      expect(icon.type).toBe("image/png");
    }
  });

  it("no mezcla 'any maskable' en un solo ícono (pierde calidad en Android)", () => {
    for (const icon of manifest().icons ?? []) {
      expect(icon.purpose ?? "any").not.toMatch(/any maskable|maskable any/);
    }
  });

  it("la configuración compartida coincide con el manifest", () => {
    expect(m.name).toBe(PWA.name);
    expect(m.theme_color).toBe(PWA.themeColor);
    expect(PWA.appleTouchIcon).toBe("/icons/apple-touch-icon.png");
  });
});
