export function formatMinutes(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${String(m % 60).padStart(2, "0")} min`;
}

export function formatDayLabel(date: string): string {
  // `date` es YYYY-MM-DD; se ancla al mediodía UTC para no cambiar de día al formatear.
  return new Intl.DateTimeFormat("es", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

/** `YYYY-MM-DD` del <input type="date"> → fin de ese día en hora local (epoch ms). */
export function dateInputToMs(value: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return new Date(y, mo - 1, d, 23, 59, 59).getTime();
}

export function msToDateInput(ms: number | null): string {
  if (ms === null) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
