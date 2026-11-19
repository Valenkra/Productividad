import { existsSync } from "node:fs";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { PWA } from "@/lib/pwa/config";

const file = (publicPath: string) => `public${publicPath}`;

describe("íconos de la PWA", () => {
  const expected: [string, number][] = [
    ["/icons/icon-192.png", 192],
    ["/icons/icon-512.png", 512],
    ["/icons/icon-maskable-512.png", 512],
    [PWA.appleTouchIcon, 180],
  ];

  it.each(expected)("%s existe y mide %spx exactos", async (path, size) => {
    expect(existsSync(file(path))).toBe(true);
    const meta = await sharp(file(path)).metadata();
    expect([meta.width, meta.height, meta.format]).toEqual([size, size, "png"]);
  });

  it("todo ícono declarado en el manifest existe en disco", () => {
    for (const icon of manifest().icons ?? []) {
      expect(existsSync(file(icon.src))).toBe(true);
    }
  });

  it("el maskable es opaco en los bordes (Android recorta; no puede haber transparencia)", async () => {
    const { data, info } = await sharp(file("/icons/icon-maskable-512.png"))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const alphaAt = (x: number, y: number) =>
      data[(y * info.width + x) * info.channels + 3];
    for (const [x, y] of [
      [0, 0],
      [511, 0],
      [0, 511],
      [511, 511],
      [256, 0],
      [0, 256],
    ]) {
      expect(alphaAt(x, y)).toBe(255);
    }
  });

  it("el ícono maskable mantiene el motivo dentro de la zona segura central", async () => {
    const { data, info } = await sharp(file("/icons/icon-maskable-512.png"))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => {
      const i = (y * info.width + x) * info.channels;
      return [data[i], data[i + 1], data[i + 2]];
    };
    const background = px(2, 2);
    // Zona segura = círculo central del 80 %. Debe haber algo distinto al fondo dentro,
    // y el anillo exterior (fuera del 90 % del lado) debe ser solo fondo.
    let motifInside = false;
    for (let y = 100; y < 412 && !motifInside; y += 4) {
      for (let x = 100; x < 412; x += 4) {
        if (px(x, y).some((v, c) => Math.abs(v - background[c]) > 30)) {
          motifInside = true;
          break;
        }
      }
    }
    expect(motifInside).toBe(true);
    for (const [x, y] of [
      [20, 256],
      [491, 256],
      [256, 20],
      [256, 491],
    ]) {
      expect(px(x, y)).toEqual(background);
    }
  });
});
