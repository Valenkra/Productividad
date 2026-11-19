"use client";

import { useEffect, useState } from "react";
import { growthInfo, MAX_STAGE, STAGE_NAMES, STAGE_THRESHOLDS } from "./growth";
import { PlantIllustration } from "./plant-illustration";

export function GardenView() {
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/garden", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return (await res.json()) as { plantTotalSeconds: number };
      })
      .then((g) => !cancelled && setTotal(g.plantTotalSeconds))
      .catch(() => !cancelled && setError("No se pudo cargar tu jardín."));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (total === null) return <p role="status">Cargando jardín…</p>;

  const info = growthInfo(total);
  const percent = Math.round(info.stageProgress * 100);

  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
      <h1 className="text-2xl font-semibold">Tu jardín</h1>
      <PlantIllustration key={info.stage} stage={info.stage} />
      <div>
        <p className="text-xl font-medium">{info.name}</p>
        <p className="text-sm text-muted">
          {info.units} min de foco acumulados (+{info.partialSeconds}/60 s)
        </p>
      </div>

      {info.unitsToNextStage !== null ? (
        <div className="w-full">
          <div
            role="progressbar"
            aria-label="Progreso hacia la siguiente etapa"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-3 w-full overflow-hidden rounded-full bg-border"
          >
            <div
              className="h-full bg-leaf transition-[width]"
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className="mt-2 text-sm text-muted">
            {percent}% · Faltan {info.unitsToNextStage} min para «
            {STAGE_NAMES[info.stage + 1]}»
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted">¡Tu planta está en su máximo esplendor!</p>
      )}

      {total === 0 && (
        <p className="text-sm text-muted">
          Todavía no hay crecimiento. Completá minutos de foco para verla crecer.
        </p>
      )}

      <ol className="grid w-full grid-cols-3 gap-2 text-xs" aria-label="Etapas">
        {STAGE_NAMES.map((name, i) => {
          const reached = i <= info.stage;
          return (
            <li
              key={name}
              className={`rounded-lg border p-2 ${
                reached ? "border-leaf bg-surface" : "border-border text-muted"
              }`}
            >
              <span className="block font-medium">
                {reached ? "✓ " : ""}
                {name}
              </span>
              {i > 0 && i <= MAX_STAGE && <span>{STAGE_THRESHOLDS[i]} min</span>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
