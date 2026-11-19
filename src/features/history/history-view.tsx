"use client";

import { formatDayLabel, formatMinutes } from "@/lib/time/format";
import { useStats } from "./use-stats";

const MODE_LABEL = {
  focus: "Concentración",
  short_break: "Descanso corto",
  long_break: "Descanso largo",
} as const;

export function HistoryView() {
  const { data, error, loading } = useStats();

  if (loading) return <p role="status">Cargando historial…</p>;
  if (error || !data)
    return <p role="alert">{error ?? "No se pudo cargar el historial."}</p>;

  const max = Math.max(60, ...data.days.map((d) => d.focusSeconds));
  const tz = data.timeZone;

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-semibold">Historial</h1>

      <dl className="grid grid-cols-3 gap-3 text-center">
        {[
          ["Últimos 7 días", formatMinutes(data.weekFocusSeconds)],
          ["Total", formatMinutes(data.totalFocusSeconds)],
          ["Racha", `${data.streakDays} ${data.streakDays === 1 ? "día" : "días"}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border bg-surface p-3">
            <dt className="text-xs text-muted">{label}</dt>
            <dd className="text-lg font-semibold">{value}</dd>
          </div>
        ))}
      </dl>

      <div>
        <h2 className="mb-2 font-medium">Foco por día</h2>
        {/* Barras con alto proporcional; la tabla accesible repite los mismos datos. */}
        <div className="flex h-40 items-end gap-1" aria-hidden="true">
          {data.days.map((d) => (
            <div key={d.date} className="flex h-full flex-1 flex-col justify-end">
              <div
                className="rounded-t bg-leaf"
                style={{
                  height: `${(d.focusSeconds / max) * 100}%`,
                  minHeight: d.focusSeconds ? 2 : 0,
                }}
                title={`${d.date}: ${formatMinutes(d.focusSeconds)}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-1 flex gap-1 text-[10px] text-muted" aria-hidden="true">
          {data.days.map((d, i) => (
            <span key={d.date} className="flex-1 text-center">
              {i % 2 === 0 ? formatDayLabel(d.date) : ""}
            </span>
          ))}
        </div>
        <table className="sr-only">
          <caption>Minutos de foco por día</caption>
          <tbody>
            {data.days.map((d) => (
              <tr key={d.date}>
                <th scope="row">{d.date}</th>
                <td>{formatMinutes(d.focusSeconds)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="mb-2 font-medium">Por tarea</h2>
        {data.perTask.length === 0 ? (
          <p className="text-sm text-muted">
            Todavía no hay sesiones asociadas a tareas.
          </p>
        ) : (
          <ul className="text-sm">
            {data.perTask.map((t) => (
              <li
                key={t.taskId}
                className="flex justify-between border-b border-border py-1"
              >
                <span>Tarea {t.taskId.slice(0, 8)}</span>
                <span>{formatMinutes(t.focusSeconds)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="mb-2 font-medium">Sesiones recientes</h2>
        {data.recentSessions.length === 0 ? (
          <p className="text-sm text-muted">Todavía no terminaste ninguna sesión.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.recentSessions.map((s) => (
              <li
                key={s.id}
                className="rounded-xl border border-border bg-surface p-3 text-sm"
              >
                <div className="flex justify-between">
                  <span className="font-medium">{MODE_LABEL[s.mode]}</span>
                  <span className="text-muted">
                    {new Intl.DateTimeFormat("es", {
                      dateStyle: "short",
                      timeStyle: "short",
                      timeZone: tz,
                    }).format(new Date(s.startedAt))}
                  </span>
                </div>
                <p className="text-muted">
                  Planificado {formatMinutes(s.plannedSeconds)} · Acreditado{" "}
                  {formatMinutes(s.creditedSeconds)} ·{" "}
                  {s.status === "completed" ? "Completada" : "Interrumpida"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
