"use client";

import { card } from "@/components/ui/styles";
import { subjectOf } from "@/features/tasks/subjects";
import type { TaskWithProgress } from "@/features/tasks/types";
import { useApi } from "@/lib/utils/use-api";
import { minutesBySubject, weekBars, type WeekBar } from "./stats-view-model";
import { useStats } from "./use-stats";

const DAY_NAMES: Record<string, string> = {
  L: "Lunes",
  M: "Martes",
  X: "Miércoles",
  J: "Jueves",
  V: "Viernes",
  S: "Sábado",
  D: "Domingo",
};

const BAR_COLOR: Record<WeekBar["kind"], string> = {
  today: "bg-accent",
  past: "bg-bar-past",
  future: "bg-track",
};

export function StatsView() {
  const { data, error, loading } = useStats();
  const tasks = useApi<{ tasks: TaskWithProgress[] }>("/api/tasks?status=all");

  if (loading) return <p role="status">Cargando…</p>;
  if (error || !data)
    return <p role="alert">{error ?? "No se pudieron cargar tus estadísticas."}</p>;

  const bars = weekBars(data.days, data.today.date);
  const max = Math.max(1, ...bars.map((b) => b.minutes));
  const subjects = minutesBySubject(data.perTask, tasks.data?.tasks ?? []);
  const maxSubject = Math.max(1, ...subjects.map((s) => s.minutes));

  const tiles = [
    {
      label: "min hoy",
      value: Math.round(data.today.focusSeconds / 60),
      bg: "bg-peach",
      note: `meta: ${Math.round(data.today.goalSeconds / 60)} min`,
    },
    { label: "pomodoros", value: data.today.pomodoros, bg: "bg-mint" },
    { label: "días de racha", value: data.streakDays, bg: "bg-lilac" },
  ];

  return (
    <section className="flex flex-col gap-5">
      <header>
        <p className="text-sm font-medium text-muted">Tu semana de estudio</p>
        <h1 className="text-[30px] font-semibold leading-tight">Estadísticas</h1>
      </header>

      <div className="grid grid-cols-3 gap-2.5">
        {tiles.map((t) => (
          <div key={t.label} className={`rounded-[22px] p-3 ${t.bg}`}>
            <span className="block text-[28px] font-semibold leading-tight tabular-nums">
              {t.value}
            </span>
            <p className="text-[13px] font-medium text-muted">{t.label}</p>
            {t.note && <span className="text-[11px] text-muted">{t.note}</span>}
          </div>
        ))}
      </div>

      <div className={`${card} p-4`}>
        <h2 className="text-[15px] font-semibold">Minutos por día</h2>
        <ol aria-label="Minutos por día" className="mt-3 flex h-[170px] items-end gap-2">
          {bars.map((b) => (
            <li
              key={b.date}
              aria-label={`${b.kind === "today" ? "Hoy" : DAY_NAMES[b.label]}: ${b.minutes} min`}
              aria-current={b.kind === "today" ? "date" : undefined}
              className="flex h-full flex-1 flex-col items-center justify-end gap-1"
            >
              <span aria-hidden="true" className="text-xs text-muted tabular-nums">
                {b.minutes}
              </span>
              <span
                aria-hidden="true"
                className={`w-full rounded-[10px] ${BAR_COLOR[b.kind]}`}
                style={{ height: `${Math.max(6, (b.minutes / max) * 118)}px` }}
              />
              <span
                aria-hidden="true"
                className={`text-xs font-semibold ${b.kind === "today" ? "text-accent" : "text-muted"}`}
              >
                {b.label}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h2 className="mb-3 text-[15px] font-semibold">Por materia</h2>
        {subjects.length === 0 ? (
          <p className="text-sm text-muted">
            Todavía no hay minutos por materia. Elige una tarea con materia antes de
            empezar un pomodoro.
          </p>
        ) : (
          <ul aria-label="Por materia" className="flex flex-col gap-3">
            {subjects.map((s) => (
              <li
                key={s.subject ?? "none"}
                aria-label={`${s.name}: ${s.minutes} min`}
                className="flex flex-col gap-1"
              >
                <span aria-hidden="true" className="flex justify-between text-sm">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted">{`${s.minutes} min`}</span>
                </span>
                <span aria-hidden="true" className="h-3 rounded-full bg-track">
                  <span
                    className={`block h-full rounded-full border-[1.5px] border-ink ${
                      subjectOf(s.subject)?.bg ?? "bg-line"
                    }`}
                    style={{ width: `${Math.max(4, (s.minutes / maxSubject) * 100)}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
