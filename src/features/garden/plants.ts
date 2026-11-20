import type { FocusSession } from "@/features/focus-tracking/types";
import type { SubjectId } from "@/features/tasks/subjects";

/** Una planta del jardín: un foco completado. */
export interface GardenPlant {
  /** Id de la sesión. */
  id: string;
  taskId: string | null;
  title: string;
  subject: SubjectId | null;
  minutes: number;
  /** Epoch ms del final de la sesión. */
  endedAt: number;
}

export type TaskInfo = { title: string; subject: SubjectId | null };

/** Solo los focos completados florecen; los abandonados y los descansos no generan planta. */
export function gardenPlants(
  sessions: FocusSession[],
  tasks: Map<string, TaskInfo>,
): GardenPlant[] {
  return sessions
    .filter((s) => s.mode === "focus" && s.status === "completed" && s.endedAt !== null)
    .map((s) => {
      const task = s.taskId ? tasks.get(s.taskId) : undefined;
      return {
        id: s.id,
        taskId: s.taskId,
        title: task?.title ?? (s.taskId ? "Tarea eliminada" : "Sesión libre"),
        subject: task?.subject ?? null,
        minutes: Math.round(s.creditedSeconds / 60),
        endedAt: s.endedAt ?? 0,
      };
    })
    .sort((a, b) => b.endedAt - a.endedAt);
}

export interface PlantDay {
  key: string;
  label: string;
  totalMinutes: number;
  plants: GardenPlant[];
}

const startOfDay = (ms: number) => {
  const d = new Date(ms);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};

/** Diferencia en días de calendario local (robusta a cambios de horario). */
const daysBetween = (a: number, b: number) =>
  Math.round((startOfDay(a) - startOfDay(b)) / 86_400_000);

function dayLabel(ms: number, now: number): string {
  const ago = daysBetween(now, ms);
  if (ago === 0) return "Hoy";
  if (ago === 1) return "Ayer";
  if (ago > 1 && ago < 7) {
    const name = new Intl.DateTimeFormat("es", { weekday: "long" }).format(new Date(ms));
    return name.charAt(0).toUpperCase() + name.slice(1);
  }
  return new Intl.DateTimeFormat("es", { day: "numeric", month: "long" }).format(
    new Date(ms),
  );
}

/** Agrupa (ya ordenadas, más nuevas primero) por día local. */
export function groupPlantsByDay(plants: GardenPlant[], now: number): PlantDay[] {
  const groups: PlantDay[] = [];
  for (const p of plants) {
    const key = String(startOfDay(p.endedAt));
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, label: dayLabel(p.endedAt, now), totalMinutes: 0, plants: [] };
      groups.push(group);
    }
    group.plants.push(p);
    group.totalMinutes += p.minutes;
  }
  return groups;
}
