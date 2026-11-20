"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnPrimary, card, field, focusRing } from "@/components/ui/styles";
import { PlantIllustration } from "@/features/garden/plant-illustration";
import type { UserSettings } from "@/features/settings/schema";

const RHYTHMS = [
  { id: "classic", name: "Clásico", detail: "25/5", focus: 25, short: 5, long: 15 },
  { id: "deep", name: "Profundo", detail: "50/10", focus: 50, short: 10, long: 20 },
  { id: "light", name: "Ligero", detail: "15/3", focus: 15, short: 3, long: 10 },
] as const;

const HOW = [
  { n: 1, title: "Elige una tarea", text: "De tu lista de pendientes", bg: "bg-lilac" },
  {
    n: 2,
    title: "Concéntrate 25 minutos",
    text: "La planta crece mientras estudias",
    bg: "bg-peach",
  },
  {
    n: 3,
    title: "Descansa y colecciona",
    text: "Cada flor va a tu jardín",
    bg: "bg-mint",
  },
];

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [rhythm, setRhythm] = useState<(typeof RHYTHMS)[number]["id"]>("classic");
  const [saving, setSaving] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  async function finish(patch: Partial<UserSettings>) {
    setSaving(true);
    setProblem(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, onboardingDone: true }),
      });
      if (!res.ok) throw new Error();
      router.push("/focus");
    } catch {
      setProblem("No se pudo guardar. Prueba de nuevo.");
      setSaving(false);
    }
  }

  function onNext() {
    if (step < 2) {
      setStep(step + 1);
      return;
    }
    const r = RHYTHMS.find((x) => x.id === rhythm)!;
    void finish({
      displayName: name.trim(),
      focusMinutes: r.focus,
      shortBreakMinutes: r.short,
      longBreakMinutes: r.long,
    });
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-6 px-5 pb-8 pt-6">
      <div className="flex items-center justify-between">
        <ol aria-label="Pasos" className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <li
              key={i}
              aria-current={i === step ? "step" : undefined}
              aria-label={`Paso ${i + 1} de 3`}
              className={`h-2 rounded-full transition-[width,background-color] ${
                i === step ? "w-[26px] bg-accent" : "w-2 bg-line"
              }`}
            />
          ))}
        </ol>
        <button
          type="button"
          disabled={saving}
          onClick={() => void finish({})}
          className={`min-h-11 px-2 text-[15px] font-medium text-muted ${focusRing}`}
        >
          Saltar
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-5">
        {step === 0 && (
          <>
            <div className="grid h-[380px] max-h-[48vh] place-items-center rounded-[36px] border-[1.5px] border-ink bg-mint shadow-[0_4px_0_var(--ink)]">
              <div className="h-[75%] w-[60%] [&_svg]:h-full [&_svg]:w-full">
                <PlantIllustration stage={5} growing />
              </div>
            </div>
            <h1 className="text-[34px] font-semibold leading-[1.1]">
              Estudia y haz crecer tu planta
            </h1>
            <p className="text-[17px] text-muted">
              Cada pomodoro empieza con una semilla. Si te concentras hasta el final,
              florece y se queda en tu jardín.
            </p>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-[34px] font-semibold leading-[1.1]">Así funciona</h1>
            <ol className="flex flex-col gap-3">
              {HOW.map((h) => (
                <li
                  key={h.n}
                  className={`${card} flex items-center gap-4 rounded-[24px] p-4`}
                >
                  <span
                    aria-hidden="true"
                    className={`grid size-12 shrink-0 place-items-center rounded-2xl border-[1.5px] border-ink text-xl font-semibold ${h.bg}`}
                  >
                    {h.n}
                  </span>
                  <span>
                    <span className="block text-[17px] font-semibold">{h.title}</span>
                    <span className="block text-muted">{h.text}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="text-muted">
              Si abandonas un pomodoro a medias, esa planta no florece. Sin dramas: la
              siguiente semilla te espera.
            </p>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-[34px] font-semibold leading-[1.1]">Último paso</h1>
            <label className="flex flex-col gap-2">
              <span className="text-sm font-semibold text-muted">¿Cómo te llamas?</span>
              <input
                aria-label="Tu nombre"
                value={name}
                maxLength={40}
                autoComplete="given-name"
                placeholder="Tu nombre"
                onChange={(e) => setName(e.target.value)}
                className={field}
              />
            </label>
            <div>
              <p className="mb-2 text-sm font-semibold text-muted">Tu ritmo</p>
              <div
                role="radiogroup"
                aria-label="Tu ritmo"
                className="flex flex-col gap-2.5"
              >
                {RHYTHMS.map((r) => {
                  const on = rhythm === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setRhythm(r.id)}
                      className={`flex min-h-16 items-center justify-between rounded-[20px] border-[1.5px] border-ink px-5 text-left transition-colors ${
                        on ? "bg-[#f7e3da]" : "bg-white hover:bg-peach"
                      } ${focusRing}`}
                    >
                      <span className="text-[17px] font-semibold">{r.name}</span>
                      <span className="text-muted">{`${r.detail} (largo ${r.long})`}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {problem && (
        <p role="alert" className="text-sm font-medium text-danger">
          {problem}
        </p>
      )}

      <button type="button" className={btnPrimary} disabled={saving} onClick={onNext}>
        {step < 2 ? "Siguiente" : "Empezar a estudiar"}
      </button>
    </div>
  );
}
