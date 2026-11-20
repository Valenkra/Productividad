"use client";

import { subjectOf } from "@/features/tasks/subjects";
import { PlantIllustration } from "./plant-illustration";
import { useApi } from "@/lib/utils/use-api";
import { groupPlantsByDay, type GardenPlant } from "./plants";

export function GardenView() {
  // "Ahora" = cuando llegaron los datos: Date.now() en el render rompe el prerender.
  const { data, error, receivedAt } = useApi<{ plants: GardenPlant[] }>("/api/garden");

  if (error) return <p role="alert">No se pudo cargar tu jardín.</p>;
  if (!data) return <p role="status">Cargando jardín…</p>;

  const n = data.plants.length;
  const days = groupPlantsByDay(data.plants, receivedAt);

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
