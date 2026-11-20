import { describe, expect, it } from "vitest";
import {
  focusViewModel,
  type FocusViewInput,
} from "@/features/focus-tracking/focus-view-model";
import type { FocusSession } from "@/features/focus-tracking/types";

const session = (over: Partial<FocusSession> = {}): FocusSession => ({
  id: "s",
  userId: "u",
  taskId: null,
  mode: "focus",
  status: "active",
  plannedSeconds: 1500,
  creditedSeconds: 0,
  startedAt: 0,
  pausedAt: null,
  endedAt: null,
  cursorAt: 0,
  ...over,
});

const input = (over: Partial<FocusViewInput> = {}): FocusViewInput => ({
  open: null,
  nextMode: "focus",
  nextPlannedSeconds: 1500,
  cycleFocusCount: 0,
  displayedSeconds: 0,
  remainingSeconds: 1500,
  counting: false,
  online: true,
  settings: { longBreakInterval: 4, displayName: "" },
  ...over,
});

describe("focusViewModel", () => {
  it("en reposo: semilla, tiempo planeado completo y saludo con nombre", () => {
    const vm = focusViewModel(
      input({ settings: { longBreakInterval: 4, displayName: " Vale " } }),
    );
    expect(vm).toMatchObject({
      mode: "focus",
      title: "Concentración",
      isBreak: false,
      stage: 0,
      remaining: 1500,
      greeting: "¡A por ello, Vale!",
      hint: "Pulsa empezar para plantar tu semilla",
      stateText: "Sin sesión",
      cycleNow: 1,
      cycleSize: 4,
    });
  });

  it("sin nombre ni ajustes usa el saludo genérico y un ciclo de 4", () => {
    const vm = focusViewModel(input({ settings: null }));
    expect(vm.greeting).toBe("¡A por ello!");
    expect(vm.cycleSize).toBe(4);
  });

  it("corriendo: la etapa sale del tiempo mostrado y avisa la siguiente", () => {
    const vm = focusViewModel(
      input({
        open: session(),
        displayedSeconds: 400, // 400/1500 → etapa 1; la 2 empieza en 600
        remainingSeconds: 1100,
        counting: true,
      }),
    );
    expect(vm).toMatchObject({
      running: true,
      stage: 1,
      remaining: 1100,
      greeting: "Concentración a tope",
      hint: "Plántula en 03:20",
      stateText: "Contando tiempo",
    });
  });

  it("en la última etapa antes de florecer dice que florece al terminar", () => {
    const vm = focusViewModel(
      input({ open: session(), displayedSeconds: 1300, counting: true }),
    );
    expect(vm.hint).toBe("Florece al terminar");
  });

  it("pausada: lo dice y no cuenta tiempo", () => {
    const vm = focusViewModel(input({ open: session({ status: "paused" }) }));
    expect(vm.paused).toBe(true);
    expect(vm.hint).toBe("En pausa — tu planta te espera");
    expect(vm.stateText).toBe("Pausada: no se está contando tiempo");
  });

  it("activa sin contar: distingue sin conexión de app en segundo plano", () => {
    expect(focusViewModel(input({ open: session(), online: false })).stateText).toBe(
      "Sin conexión: no se cuenta tiempo",
    );
    expect(focusViewModel(input({ open: session() })).stateText).toBe(
      "Esperando que vuelvas a la app",
    );
  });

  it("descanso: planta florecida, consejo y ciclo sin avanzar", () => {
    const vm = focusViewModel(
      input({ nextMode: "short_break", nextPlannedSeconds: 300, cycleFocusCount: 2 }),
    );
    expect(vm).toMatchObject({
      isBreak: true,
      title: "Descanso corto",
      stage: 5,
      greeting: "¡Floreció! Bien hecho",
      hint: "Pulsa empezar para descansar",
      breakTip: "Levántate, estira la espalda y bebe agua.",
      cycleNow: 2,
    });
    const running = focusViewModel(
      input({ open: session({ mode: "long_break" }), counting: true }),
    );
    expect(running.hint).toBe("Disfruta del descanso");
    expect(running.breakTip).toBe("Descanso largo: sal a caminar o come algo rico.");
    expect(
      focusViewModel(input({ open: session({ mode: "short_break", status: "paused" }) }))
        .hint,
    ).toBe("En pausa");
  });

  it("el ciclo nunca pasa del tamaño configurado", () => {
    expect(focusViewModel(input({ cycleFocusCount: 7 })).cycleNow).toBe(4);
  });
});
