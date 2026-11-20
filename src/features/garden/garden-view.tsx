"use client";

import { useEffect, useState } from "react";
import { subjectOf } from "@/features/tasks/subjects";
import { PlantIllustration } from "./plant-illustration";
import { groupPlantsByDay, type GardenPlant } from "./plants";

export function GardenView() {
  const [data, setData] = useState<{ plants: GardenPlant[]; now: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/garden", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return (await res.json()) as { plants: GardenPlant[] };
      })
      // "Ahora" se fija al recibir los datos: Date.now() en el render rompe el prerender.
      .then((g) => !cancelled && setData({ plants: g.plants, now: Date.now() }))
      .catch(() => !cancelled && setError("No se pudo cargar tu jardín."));
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <p role="alert">{error}</p>;
  if (!data) return <p role="status">Cargando jardín…</p>;

  const n = data.plants.length;
  const days = groupPlantsByDay(data.plants, data.now);

  return (
    <section className="flex flex-col gap-5">
      <header>
        <p className="text-sm font-medium text-muted">
          {n === 1 ? "1 planta florecida" : `${n} plantas florecidas`}
        </p>
        <h1 className="text-[30px] font-semibold leading-tight">Jardín</h1>
      </header>

      {n === 0 && (
        <p className="rounded-[22px] bg-mint p-5 font-medium">
          Tu jardín está vacío. Completa un pomodoro para que florezca tu primera planta.
        </p>
      )}

      {days.map((day) => (
        <section key={day.key} aria-label={day.label} className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[15px] font-semibold">{day.label}</h2>
            <span className="text-sm text-muted">{`${day.totalMinutes} min`}</span>
          </div>
          <ul className="grid grid-cols-3 gap-2.5">
            {day.plants.map((p) => {
              const subject = subjectOf(p.subject);
              return (
                <li
                  key={p.id}
                  aria-label={[p.title, subject?.name, `${p.minutes} min`]
                    .filter(Boolean)
                    .join(" · ")}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span
                    aria-hidden="true"
                    className={`grid aspect-square w-full place-items-center rounded-[22px] border-[1.5px] border-ink ${
                      subject?.bg ?? "bg-mint"
                    }`}
                  >
                    <span className="h-[78%] w-[70%] [&_svg]:h-full [&_svg]:w-full">
                      <PlantIllustration stage={5} />
                    </span>
                  </span>
                  <span className="line-clamp-2 text-center text-xs leading-tight">
                    {p.title}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </section>
  );
}
