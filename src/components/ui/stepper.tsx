"use client";

import { Minus, Plus } from "lucide-react";
import { btnRound, focusRing } from "./styles";

const smallBtn = `grid size-9 place-items-center rounded-xl border-[1.5px] border-ink bg-white transition-colors hover:bg-peach disabled:opacity-40 ${focusRing}`;

/** Contador − valor + con límites. `size="lg"` usa botones redondos de 44 px. */
export function Stepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  display = String(value),
  decreaseLabel = "Disminuir",
  increaseLabel = "Aumentar",
  size = "sm",
}: {
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  display?: string;
  decreaseLabel?: string;
  increaseLabel?: string;
  size?: "sm" | "lg";
}) {
  const btn = size === "lg" ? btnRound : smallBtn;
  const icon = size === "lg" ? 18 : 16;
  return (
    <span className={`flex items-center ${size === "lg" ? "gap-4" : "gap-3"}`}>
      <button
        type="button"
        aria-label={decreaseLabel}
        className={btn}
        disabled={value - step < min}
        onClick={() => onChange(value - step)}
      >
        <Minus size={icon} strokeWidth={2.6} aria-hidden="true" />
      </button>
      <span
        className={`text-center font-semibold tabular-nums ${
          size === "lg" ? "min-w-8 text-2xl" : "min-w-16"
        }`}
      >
        {display}
      </span>
      <button
        type="button"
        aria-label={increaseLabel}
        className={btn}
        disabled={value + step > max}
        onClick={() => onChange(value + step)}
      >
        <Plus size={icon} strokeWidth={2.6} aria-hidden="true" />
      </button>
    </span>
  );
}
