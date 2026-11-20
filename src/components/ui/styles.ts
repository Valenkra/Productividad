/**
 * Clases compartidas del rediseño «Pastel juguetón» (paleta Suave): bordes de tinta y
 * sombras sólidas de 4 px. Son cadenas literales para que Tailwind las detecte.
 */
const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

/** Tarjeta blanca «física». */
export const card =
  "rounded-[22px] border-[1.5px] border-ink bg-white shadow-[0_4px_0_var(--ink)]";

const press =
  "transition-[transform,box-shadow,background-color] active:translate-y-1 active:shadow-[0_0_0_var(--ink)] disabled:opacity-50";

/** Botón primario «gordito» (60 px de alto). */
export const btnPrimary = `inline-flex min-h-[60px] items-center justify-center gap-2 rounded-[22px] border-[1.5px] border-ink bg-accent px-6 text-lg font-semibold text-white shadow-[0_4px_0_var(--ink)] hover:bg-accent-hover ${press} ${focusRing}`;

/** Botón secundario blanco. */
export const btnSecondary = `inline-flex min-h-[60px] items-center justify-center gap-2 rounded-[22px] border-[1.5px] border-ink bg-white px-5 text-lg font-semibold shadow-[0_4px_0_var(--ink)] hover:bg-peach ${press} ${focusRing}`;

/** Botón redondo de 44 px (cerrar, ajustes, volver). */
export const btnRound = `grid size-11 shrink-0 place-items-center rounded-full border-[1.5px] border-ink bg-white shadow-[0_3px_0_var(--ink)] ${press} ${focusRing}`;

/** Chip seleccionable de 38 px. */
export const chip = `inline-flex min-h-[38px] items-center rounded-full border-[1.5px] px-4 text-sm font-semibold transition-colors ${focusRing}`;
export const chipOff = "border-chip-line bg-white";
export const chipOn = "border-ink";

/** Campo de texto (58 px de alto). */
export const field = `min-h-[58px] w-full rounded-[18px] border-[1.5px] border-ink bg-white px-4 text-base placeholder:text-[#b3a2bf] focus:outline-none focus:shadow-[0_0_0_4px_#ffd3c4]`;

export { focusRing };
