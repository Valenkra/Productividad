"use client";

import { useState, type FormEvent } from "react";
import { useApi } from "@/lib/utils/use-api";
import { userSettingsSchema, type UserSettings } from "./schema";

const FIELDS: { key: keyof UserSettings; label: string; min: number; max: number }[] = [
  { key: "focusMinutes", label: "Concentración (min)", min: 1, max: 180 },
  { key: "shortBreakMinutes", label: "Descanso corto (min)", min: 1, max: 60 },
  { key: "longBreakMinutes", label: "Descanso largo (min)", min: 1, max: 120 },
  { key: "longBreakInterval", label: "Descanso largo cada N focos", min: 2, max: 12 },
  { key: "dailyGoalMinutes", label: "Meta diaria (min)", min: 1, max: 1440 },
];

export function SettingsForm() {
  const { data, error, loading } = useApi<UserSettings>("/api/settings");
  if (loading) return <p role="status">Cargando ajustes…</p>;
  if (error || !data)
    return <p role="alert">{error ?? "No se pudieron cargar los ajustes."}</p>;
  return <Form initial={data} />;
}

function Form({ initial }: { initial: UserSettings }) {
  const [values, setValues] = useState<Record<keyof UserSettings, string>>(
    () =>
      Object.fromEntries(
        Object.entries(initial).map(([k, v]) => [k, String(v)]),
      ) as Record<keyof UserSettings, string>,
  );
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const parsed = userSettingsSchema.safeParse(
      Object.fromEntries(Object.entries(values).map(([k, v]) => [k, Number(v)])),
    );
    if (!parsed.success) {
      setMessage({ ok: false, text: "Revisá los valores: hay números fuera de rango." });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      setMessage(
        res.ok
          ? { ok: true, text: "Guardado. Se aplica desde la próxima fase." }
          : { ok: false, text: "No se pudo guardar." },
      );
    } catch {
      setMessage({ ok: false, text: "Sin conexión: no se pudo guardar." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={onSubmit} className="mx-auto flex max-w-md flex-col gap-4">
      <h1 className="text-2xl font-semibold">Ajustes</h1>
      {FIELDS.map((f) => (
        <label key={f.key} className="flex flex-col gap-1 text-sm">
          {f.label}
          <input
            type="number"
            inputMode="numeric"
            min={f.min}
            max={f.max}
            value={values[f.key]}
            onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
            className="min-h-12 rounded-lg border border-border bg-surface px-3 text-base"
          />
        </label>
      ))}
      <button
        type="submit"
        disabled={saving}
        className="min-h-12 rounded-xl bg-leaf-strong px-5 text-base font-medium text-white disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Guardar"}
      </button>
      {message && (
        <p role={message.ok ? "status" : "alert"} className="text-sm">
          {message.text}
        </p>
      )}
      <p className="text-xs text-muted">
        La zona horaria se toma del navegador. Cerrar sesión estará disponible con la
        cuenta (Fase 2).
      </p>
    </form>
  );
}
