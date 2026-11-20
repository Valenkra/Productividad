"use client";

import { ChevronLeft, Minus, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApi } from "@/lib/utils/use-api";
import type { UserSettings } from "./schema";

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

const card = "rounded-[22px] border-2 border-ink bg-white shadow-[0_4px_0_var(--ink)]";
const stepBtn =
  "grid size-9 place-items-center rounded-xl border-2 border-ink bg-white transition-colors hover:bg-peach disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function SettingsForm() {
  const { data, error, loading } = useApi<UserSettings>("/api/settings");
  if (loading) return <p role="status">Cargando ajustes…</p>;
  if (error || !data)
    return <p role="alert">{error ?? "No se pudieron cargar los ajustes."}</p>;
  return <Form initial={data} />;
}

function Form({ initial }: { initial: UserSettings }) {
  const router = useRouter();
  const [values, setValues] = useState<UserSettings>(initial);
  const [problem, setProblem] = useState<string | null>(null);

  /** Guarda un campo al instante; si falla, vuelve al valor anterior. */
  async function save(patch: Partial<UserSettings>): Promise<boolean> {
    const previous = values;
    setValues({ ...values, ...patch });
    setProblem(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error("rejected");
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
        <Link
          href="/focus"
          aria-label="Volver"
          className="grid size-11 place-items-center rounded-full border-2 border-ink bg-white shadow-[0_3px_0_var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
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
                  i > 0 ? "border-t-2 border-line" : ""
                }`}
              >
                <span className="font-medium">{s.label}</span>
                <span className="flex items-center gap-3">
                  <button
                    type="button"
                    aria-label="Disminuir"
                    className={stepBtn}
                    disabled={value - s.step < s.min}
                    onClick={() => void save({ [s.key]: value - s.step })}
                  >
                    <Minus size={16} strokeWidth={2.6} aria-hidden="true" />
                  </button>
                  <span className="min-w-16 text-center font-semibold tabular-nums">
                    {s.format(value)}
                  </span>
                  <button
                    type="button"
                    aria-label="Aumentar"
                    className={stepBtn}
                    disabled={value + s.step > s.max}
                    onClick={() => void save({ [s.key]: value + s.step })}
                  >
                    <Plus size={16} strokeWidth={2.6} aria-hidden="true" />
                  </button>
                </span>
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
                  i > 0 ? "border-t-2 border-line" : ""
                }`}
              >
                <span className="font-medium">{t.label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={t.label}
                  onClick={() => void save({ [t.key]: !on })}
                  className={`relative h-8 w-[54px] shrink-0 rounded-full border-2 border-ink transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                    on ? "bg-[#7fcf9f]" : "bg-line"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute top-1/2 size-6 -translate-y-1/2 rounded-full border-2 border-ink bg-white transition-[left] ${
                      on ? "left-[24px]" : "left-[2px]"
                    }`}
                  />
                </button>
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
        className="min-h-12 rounded-[20px] border-2 border-dashed border-[#c9b8d6] px-4 font-medium text-muted transition-colors hover:bg-lilac"
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
