"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Stepper } from "@/components/ui/stepper";
import { btnRound, card } from "@/components/ui/styles";
import { Switch } from "@/components/ui/switch";
import { patchSettings } from "./api";
import type { UserSettings } from "./schema";
import { useSettings } from "./settings-context";

type NumericKey =
  | "focusMinutes"
  | "shortBreakMinutes"
  | "longBreakMinutes"
  | "longBreakInterval"
  | "dailyGoalMinutes";
type ToggleKey = "autoStartBreak" | "sound";

const STEPPERS: {
  key: NumericKey;
  label: string;
  step: number;
  min: number;
  max: number;
  format: (n: number) => string;
}[] = [
  {
    key: "focusMinutes",
    label: "Concentración",
    step: 5,
    min: 5,
    max: 180,
    format: (n) => `${n} min`,
  },
  {
    key: "shortBreakMinutes",
    label: "Descanso corto",
    step: 1,
    min: 1,
    max: 60,
    format: (n) => `${n} min`,
  },
  {
    key: "longBreakMinutes",
    label: "Descanso largo",
    step: 5,
    min: 5,
    max: 120,
    format: (n) => `${n} min`,
  },
  {
    key: "longBreakInterval",
    label: "Ciclo",
    step: 1,
    min: 2,
    max: 12,
    format: (n) => `${n} focos`,
  },
  {
    key: "dailyGoalMinutes",
    label: "Meta diaria",
    step: 5,
    min: 5,
    max: 1440,
    format: (n) => `${n} min`,
  },
];

const TOGGLES: { key: ToggleKey; label: string }[] = [
  { key: "autoStartBreak", label: "Empezar descanso automáticamente" },
  { key: "sound", label: "Sonido al terminar" },
];

export function SettingsForm() {
  const { settings: data, error, loading, setSettings } = useSettings();
  if (loading) return <p role="status">Cargando ajustes…</p>;
  if (error || !data)
    return <p role="alert">{error ?? "No se pudieron cargar los ajustes."}</p>;
  return <Form initial={data} onSaved={setSettings} />;
}

function Form({
  initial,
  onSaved,
}: {
  initial: UserSettings;
  /** Comparte lo guardado con el resto de la app (Foco, Tareas…). */
  onSaved: (settings: UserSettings) => void;
}) {
  const router = useRouter();
  const [values, setValues] = useState<UserSettings>(initial);
  const [problem, setProblem] = useState<string | null>(null);

  /** Guarda un campo al instante; si falla, vuelve al valor anterior. */
  async function save(patch: Partial<UserSettings>): Promise<boolean> {
    const previous = values;
    setValues({ ...values, ...patch });
    setProblem(null);
    try {
      onSaved(await patchSettings(patch));
      return true;
    } catch (e) {
      setValues(previous);
      setProblem(
        e instanceof TypeError
          ? "Sin conexión: no se pudo guardar."
          : "No se pudo guardar.",
      );
      return false;
    }
  }

  return (
    <section className="flex flex-col gap-5">
      <header className="flex items-center gap-3">
        <Link href="/focus" aria-label="Volver" className={btnRound}>
          <ChevronLeft size={22} strokeWidth={2.2} aria-hidden="true" />
        </Link>
        <h1 className="text-[30px] font-semibold leading-none">Ajustes</h1>
      </header>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted">Tiempos</h2>
        <div className={card}>
          {STEPPERS.map((s, i) => {
            const value = values[s.key];
            return (
              <div
                key={s.key}
                role="group"
                aria-label={s.label}
                className={`flex items-center justify-between gap-3 px-4 py-3 ${
                  i > 0 ? "border-t-[1.5px] border-line" : ""
                }`}
              >
                <span className="font-medium">{s.label}</span>
                <Stepper
                  value={value}
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  display={s.format(value)}
                  onChange={(next) => void save({ [s.key]: next })}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-muted">Preferencias</h2>
        <div className={card}>
          {TOGGLES.map((t, i) => {
            const on = values[t.key];
            return (
              <div
                key={t.key}
                className={`flex items-center justify-between gap-3 px-4 py-3 ${
                  i > 0 ? "border-t-[1.5px] border-line" : ""
                }`}
              >
                <span className="font-medium">{t.label}</span>
                <Switch
                  checked={on}
                  label={t.label}
                  onChange={(next) => void save({ [t.key]: next })}
                />
              </div>
            );
          })}
        </div>
      </div>

      {problem && (
        <p role="alert" className="text-sm font-medium text-danger">
          {problem}
        </p>
      )}

      <button
        type="button"
        onClick={async () => {
          if (await save({ onboardingDone: false })) router.push("/onboarding");
        }}
        className="min-h-12 rounded-[20px] border-[1.5px] border-dashed border-dashed-line px-4 font-medium text-muted transition-colors hover:bg-lilac"
      >
        Ver la introducción otra vez
      </button>

      <p className="text-xs text-muted">
        La zona horaria se toma del navegador. Cerrar sesión estará disponible con la
        cuenta (Fase 2).
      </p>
    </section>
  );
}
