"use client";

import { useCallback, useEffect, useState } from "react";
import { getAttention, subscribeAttention } from "@/lib/utils/browser-signals";
import {
  autoPauseDemo,
  demoProgress,
  demoRemainingSeconds,
  demoStage,
  initialDemo,
  pauseDemo,
  resetDemo,
  startDemo,
  tickDemo,
  type DemoState,
} from "./mini-focus";

const TICK_MS = 250;

export function useMiniFocus() {
  const [state, setState] = useState<DemoState>(initialDemo);
  const running = state.status === "running";

  // Avanza el reloj mientras corre; el tiempo real entre ticks lo acota `tickDemo`.
  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    const id = setInterval(() => {
      // El delta se fija ANTES de encolar: React ejecuta el updater más tarde, cuando
      // `last` ya cambió (si no, dt sería siempre 0 y el reloj nunca avanzaría).
      const now = performance.now();
      const dt = now - last;
      last = now;
      const attentive = getAttention();
      setState((s) => tickDemo(s, dt, attentive));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running]);

  // Pausa inmediata al perder visibilidad o foco (sin esperar al siguiente tick).
  useEffect(() => {
    if (!running) return;
    return subscribeAttention(() => {
      if (!getAttention()) setState(autoPauseDemo);
    });
  }, [running]);

  return {
    state,
    remainingSeconds: demoRemainingSeconds(state),
    progress: demoProgress(state),
    stage: demoStage(state),
    start: useCallback(() => setState(startDemo), []),
    pause: useCallback(() => setState(pauseDemo), []),
    reset: useCallback(() => setState(resetDemo()), []),
  };
}
