// Genera los íconos de la PWA desde la planta «Florecida» (misma geometría que
// src/features/garden/plant-illustration.tsx). Uso: `npm run icons`.
import { mkdir, writeFile } from "node:fs/promises";
import sharp from "sharp";

const COLORS = {
  background: "#faf6ec",
  leaf: "#4f7a4a",
  leafDark: "#3a5f37",
  soil: "#8a6a4a",
  soilDark: "#6b4f36",
  petal: "#e58fa8",
  gold: "#d9a441",
};

const leaf = (x, y, angle, size = 1) =>
  `<ellipse cx="${x}" cy="${y}" rx="${13 * size}" ry="${6 * size}" transform="rotate(${angle} ${x} ${y})" fill="${size > 1 ? COLORS.leafDark : COLORS.leaf}"/>`;

/** Planta en el sistema de coordenadas original (viewBox 0 0 120 140). */
const PLANT = `
  <path d="M36 118h48l-5 20H41z" fill="${COLORS.soil}"/>
  <ellipse cx="60" cy="118" rx="26" ry="5" fill="${COLORS.soilDark}"/>
  <path d="M60 118 L60 44" stroke="${COLORS.leafDark}" stroke-width="5" stroke-linecap="round"/>
  ${leaf(50, 100, -30)}${leaf(70, 100, 30)}${leaf(51, 86, -25)}${leaf(69, 86, 25)}
  ${leaf(48, 72, -30, 1.2)}${leaf(72, 72, 30, 1.2)}${leaf(60, 58, -90, 1.1)}
  ${leaf(44, 90, -15, 1.3)}${leaf(76, 90, 15, 1.3)}${leaf(46, 60, -40, 1.2)}${leaf(74, 60, 40, 1.2)}
  ${[0, 72, 144, 216, 288]
    .map((a) => `<ellipse cx="60" cy="34" rx="5" ry="9" transform="rotate(${a} 60 44)" fill="${COLORS.petal}"/>`)
    .join("")}
  <circle cx="60" cy="44" r="5" fill="${COLORS.gold}"/>`;

/**
 * @param size lado final en px
 * @param scale tamaño de la planta (viewBox→px); la planta se centra en el lienzo
 * @param shape "square" = fondo a sangre (maskable/apple, sin transparencia);
 *              "rounded" = esquinas redondeadas (íconos «any»)
 */
function svg({ size, scale, shape }) {
  const tx = size / 2 - 60 * scale;
  const ty = size / 2 - 82 * scale; // centro vertical aproximado de la planta
  const bg =
    shape === "rounded"
      ? `<rect width="${size}" height="${size}" rx="${size * 0.22}" fill="${COLORS.background}"/>`
      : `<rect width="${size}" height="${size}" fill="${COLORS.background}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  ${bg}<g transform="translate(${tx} ${ty}) scale(${scale})">${PLANT}</g></svg>`;
}

const ICONS = [
  { file: "icon-192.png", size: 192, scale: 192 / 150, shape: "rounded" },
  { file: "icon-512.png", size: 512, scale: 512 / 150, shape: "rounded" },
  // Zona segura maskable: el motivo cabe en el círculo central del 80 % (~2.9 px/unidad).
  { file: "icon-maskable-512.png", size: 512, scale: 2.9, shape: "square" },
  { file: "apple-touch-icon.png", size: 180, scale: 180 / 150, shape: "square" },
];

await mkdir("public/icons", { recursive: true });
for (const { file, ...opts } of ICONS) {
  const png = await sharp(Buffer.from(svg(opts))).png().toBuffer();
  await writeFile(`public/icons/${file}`, png);
  console.log(`✓ public/icons/${file} (${opts.size}x${opts.size})`);
}
