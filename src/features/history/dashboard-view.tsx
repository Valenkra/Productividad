"use client";

import Link from "next/link";
import { growthInfo } from "@/features/garden/growth";
import { PlantIllustration } from "@/features/garden/plant-illustration";
import { formatMinutes } from "@/lib/time/format";
import { useStats } from "./use-stats";

export function DashboardView() {
  const { data, error, loading } = useStats();

  if (loading) return <p role="status">Cargando…</p>;
  if (error || !data)
    return <p role="alert">{error ?? "No se pudieron cargar tus datos."}</p>;

  const growth = growthInfo(data.plantTotalSeconds);
  const { today } = data;
  const percent = Math.round(today.goalProgress * 100);
  const empty = data.totalFocusSeconds === 0;

  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-5 text-center">
      <h1 className="sr-only">Inicio</h1>
      <PlantIllustration key={growth.stage} stage={growth.stage} />
      <p className="text-lg font-medium">{growth.name}</p>

      <Link
        href="/focus"
        className="flex min-h-12 w-full items-center justify-center rounded-xl bg-leaf-strong px-5 text-base font-medium text-white"
      >
        Empezar a estudiar
      </Link>

      <div className="w-full rounded-xl border border-border bg-surface p-4 text-left">
        <p className="text-sm text-muted">Hoy</p>
        <p className="text-2xl font-semibold">{formatMinutes(today.focusSeconds)}</p>
        <div
          role="progressbar"
          aria-label="Progreso de la meta diaria"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="mt-2 h-3 overflow-hidden rounded-full bg-border"
        >
          <div className="h-full bg-leaf" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-1 text-sm text-muted">
          {percent >= 100
            ? "¡Meta diaria cumplida!"
            : `${percent}% de tu meta de ${formatMinutes(today.goalSeconds)}`}
        </p>
        <p className="mt-2 text-sm text-muted">
          {today.sessions} {today.sessions === 1 ? "sesión" : "sesiones"} hoy
          {data.streakDays > 0 &&
            ` · racha de ${data.streakDays} ${data.streakDays === 1 ? "día" : "días"}`}
        </p>
      </div>

      {empty && (
        <p className="text-sm text-muted">
          Todavía no acumulaste tiempo de foco. Empezá una sesión y mirá crecer tu planta.
        </p>
      )}
    </section>
  );
}
