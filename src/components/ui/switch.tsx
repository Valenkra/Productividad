"use client";

import { focusRing } from "./styles";

/** Interruptor accesible (role="switch") de 54 × 32. */
export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-8 w-[54px] shrink-0 rounded-full border-[1.5px] border-ink transition-colors ${focusRing} ${
        checked ? "bg-switch-on" : "bg-line"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-1/2 size-6 -translate-y-1/2 rounded-full border-[1.5px] border-ink bg-white transition-[left] ${
          checked ? "left-[24px]" : "left-[2px]"
        }`}
      />
    </button>
  );
}
