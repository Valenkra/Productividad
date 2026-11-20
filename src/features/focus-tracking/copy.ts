import type { FocusMode } from "./types";

export const MODE_LABEL: Record<FocusMode, string> = {
  focus: "Concentración",
  short_break: "Descanso corto",
  long_break: "Descanso largo",
};

export const BREAK_TIP: Record<Exclude<FocusMode, "focus">, string> = {
  short_break: "Levántate, estira la espalda y bebe agua.",
  long_break: "Descanso largo: sal a caminar o come algo rico.",
};
