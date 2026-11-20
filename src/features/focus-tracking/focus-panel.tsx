"use client";

import { Settings, SkipForward } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { btnPrimary, btnRound, btnSecondary, focusRing } from "@/components/ui/styles";
import { nextStageIn, sessionStage, STAGE_NAMES } from "@/features/garden/growth";
import { PlantIllustration } from "@/features/garden/plant-illustration";
import type { UserSettings } from "@/features/settings/schema";
import { subjectOf } from "@/features/tasks/subjects";
import { TaskPicker } from "@/features/tasks/task-picker";
import type { TaskWithProgress } from "@/features/tasks/types";
import { playChime } from "@/lib/utils/chime";
import { useApi } from "@/lib/utils/use-api";
import type { FocusMode } from "./types";
import { useFocusSession } from "./use-focus-session";

const MODE_LABEL: Record<FocusMode, string> = {
  focus: "Concentración",
  short_break: "Descanso corto",
  long_break: "Descanso largo",
};

const BREAK_TIP: Record<Exclude<FocusMode, "focus">, string> = {
  short_break: "Levántate, estira la espalda y bebe agua.",
  long_break: "Descanso largo: sal a caminar o come algo rico.",
};

function mmss(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const isOpenTask = (t: TaskWithProgress) =>
  t.status === "todo" || t.status === "in_progress";

export function FocusPanel() {
  const f = useFocusSession();
  const search = useSearchParams();
  const settings = useApi<UserSettings>("/api/settings").data;
  // Se recarga cuando cambia el ciclo (un foco completado suma pomodoros a su tarea).
  const tasksApi = useApi<{ tasks: TaskWithProgress[] }>(
    "/api/tasks?sort=priority",
    f.state?.cycleFocusCount ?? 0,
  );
  const [created, setCreated] = useState<TaskWithProgress[]>([]);
  const [taskId, setTaskId] = useState<string | null>(() => search.get("task"));
  // "Ahora" para la hoja de nueva tarea: se fija al abrir el selector, nunca en el render.
  const [pickerNow, setPickerNow] = useState<number | null>(null);
  const [givingUp, setGivingUp] = useState(false);

  // Si las tareas no cargan, el foco sigue funcionando (sesión libre).
  const allTasks = [...(tasksApi.data?.tasks ?? []), ...created];
  const openTasks = allTasks.filter(isOpenTask);

  // Al completarse una fase en pantalla: sonido y, tras un foco, descanso automático.
  const handled = useRef<string | null>(null);
  const session = f.state?.session ?? null;
  const nextMode = f.state?.nextMode;
  const { start } = f;
  useEffect(() => {
    if (!session || session.status !== "completed" || handled.current === session.id)
      return;
    handled.current = session.id;
    if (settings?.sound) playChime();
    if (session.mode === "focus" && settings?.autoStartBreak && nextMode !== "focus") {
      void start(null);
    }
  }, [session, settings, nextMode, start]);

  const closePicker = useCallback(() => setPickerNow(null), []);

  if (f.loading) return <p role="status">Cargando sesión…</p>;
  if (!f.state) return <p role="alert">{f.error ?? "No se pudo cargar el estado."}</p>;

  const open = f.open && session ? session : null;
  const mode: FocusMode = open ? open.mode : f.state.nextMode;
  const isBreak = mode !== "focus";
  const planned = open ? open.plannedSeconds : f.state.nextPlannedSeconds;
  const elapsed = open ? f.displayedSeconds : 0;
  const remaining = open ? f.remainingSeconds : planned;
  const stage = isBreak ? STAGE_NAMES.length - 1 : sessionStage(elapsed, planned, false);
  const running = open?.status === "active";
  const paused = open?.status === "paused";

  const cycleSize = settings?.longBreakInterval ?? 4;
  const done = f.state.cycleFocusCount;
  const cycleNow = Math.max(1, Math.min(cycleSize, isBreak ? done : done + 1));

  const name = settings?.displayName.trim() ?? "";
  const greeting = isBreak
    ? "¡Floreció! Bien hecho"
    : running
      ? "Concentración a tope"
      : name
        ? `¡A por ello, ${name}!`
        : "¡A por ello!";

  let hint: string;
  if (isBreak) {
    hint = paused
      ? "En pausa"
      : running
        ? "Disfruta del descanso"
        : "Pulsa empezar para descansar";
  } else if (!open) {
    hint = "Pulsa empezar para plantar tu semilla";
  } else if (paused) {
    hint = "En pausa — tu planta te espera";
  } else {
    const wait = nextStageIn(elapsed, planned);
    hint =
      wait === null
        ? "Florece al terminar"
        : `${STAGE_NAMES[stage + 1]} en ${mmss(wait)}`;
  }

  const stateText = !open
    ? "Sin sesión"
    : paused
      ? "Pausada: no se está contando tiempo"
      : f.counting
        ? "Contando tiempo"
        : !f.online
          ? "Sin conexión: no se cuenta tiempo"
          : "Esperando que vuelvas a la app";

  const sessionTask = open?.taskId
    ? allTasks.find((t) => t.id === open.taskId)
    : undefined;
  const chosenTask = taskId ? openTasks.find((t) => t.id === taskId) : undefined;
  const shownTask = open ? sessionTask : chosenTask;

  function giveUp() {
    setGivingUp(true);
    if (running) void f.pause();
  }

  return (
    <section className="relative flex flex-col gap-4">
      {/* Fondo de pantalla: cambia en el descanso. */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 -z-10 transition-colors duration-[400ms] ${
          isBreak ? "bg-rest-bg" : "bg-background"
        }`}
      />

      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-muted">{greeting}</p>
          <h1 className="text-[26px] font-semibold leading-tight">{MODE_LABEL[mode]}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            aria-label={`Pomodoro ${cycleNow} de ${cycleSize}`}
            className="rounded-full border-[1.5px] border-ink bg-white px-3 py-1 text-sm font-semibold shadow-[0_3px_0_var(--ink)]"
          >
            {`${cycleNow}/${cycleSize}`}
          </span>
          <Link href="/settings" aria-label="Ajustes" className={btnRound}>
            <Settings size={22} strokeWidth={2.2} aria-hidden="true" />
          </Link>
        </div>
      </header>

      {f.notice && (
        <p role="status" className="rounded-2xl bg-white p-3 text-sm">
          {f.notice}
        </p>
      )}
      {!f.online && (
        <p
          role="alert"
          className="rounded-2xl border-[1.5px] border-danger bg-white p-3 text-sm"
        >
          Estás sin conexión. El tiempo que no se pueda confirmar no se acredita.
        </p>
      )}
      {f.error && f.online && (
        <p role="alert" className="text-sm font-medium text-danger">
          {f.error}
        </p>
      )}

      <div
        className={`relative grid h-[260px] place-items-center overflow-hidden rounded-[36px] border-[1.5px] border-ink shadow-[0_4px_0_var(--ink)] transition-colors duration-[400ms] ${
          isBreak ? "bg-[#e3dcf3]" : "bg-mint"
        }`}
      >
        <span
          data-testid="stage-pill"
          className="absolute left-4 top-4 rounded-full bg-white px-3 py-1 text-sm font-semibold"
        >
          {STAGE_NAMES[stage]}
        </span>
        <div className="h-[220px] w-[190px] [&_svg]:h-full [&_svg]:w-full">
          <PlantIllustration
            key={stage}
            stage={stage}
            growing={Boolean(running && f.counting && !isBreak)}
            fit
          />
        </div>
      </div>

      {isBreak ? (
        <p className="rounded-[18px] bg-white px-4 py-3 text-center text-[15px] font-medium">
          {BREAK_TIP[mode]}
        </p>
      ) : (
        <StagePath stage={stage} />
      )}

      <div className="text-center">
        <p
          role="timer"
          aria-label={`Quedan ${mmss(remaining)}`}
          className="text-[84px] font-semibold leading-none tabular-nums sm:text-[92px]"
        >
          {mmss(remaining)}
        </p>
        <p aria-live="polite" className="mt-1 text-[15px] text-muted">
          {hint}
        </p>
        <p role="status" aria-label="Estado de la sesión" className="sr-only">
          {stateText}
        </p>
      </div>

      {!isBreak &&
        (open ? (
          <div className="flex items-center gap-3 rounded-[20px] bg-lilac px-3.5 py-2.5">
            <TaskSummary task={shownTask} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPickerNow(Date.now())}
            className={`flex items-center gap-3 rounded-[20px] bg-lilac px-3.5 py-2.5 text-left transition-colors hover:bg-[#e3dcf3] ${focusRing}`}
          >
            <TaskSummary task={shownTask} />
            <span className="text-sm text-muted">cambiar</span>
          </button>
        ))}

      <div className="flex gap-3">
        {!open ? (
          <button
            type="button"
            className={`${btnPrimary} flex-1`}
            disabled={!f.online}
            onClick={() => void f.start(isBreak ? null : (chosenTask?.id ?? null))}
          >
            Empezar
          </button>
        ) : running ? (
          <button
            type="button"
            className={`${btnPrimary} flex-1`}
            onClick={() => void f.pause()}
          >
            Pausar
          </button>
        ) : (
          <button
            type="button"
            className={`${btnPrimary} flex-1`}
            disabled={!f.attentive || !f.online}
            onClick={() => void f.resume()}
          >
            Seguir
          </button>
        )}
        {open && (
          <button
            type="button"
            aria-label={isBreak ? "Saltar descanso" : "Rendirse"}
            className={`${btnSecondary} h-[62px] w-[72px] !px-0`}
            onClick={() => (isBreak ? void f.finish("abandoned") : giveUp())}
          >
            <SkipForward size={24} strokeWidth={2.2} aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="text-center text-xs text-muted">
        El tiempo cuenta solo con la app abierta, visible y en primer plano. No es una
        medida de atención real.
      </p>

      {givingUp && open && !isBreak && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-[rgba(74,61,85,0.45)] px-5">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="give-up-title"
            className="w-full max-w-sm rounded-[30px] border-[1.5px] border-ink bg-white p-6 text-center shadow-[0_4px_0_var(--ink)]"
          >
            <h2 id="give-up-title" className="text-2xl font-semibold">
              ¿Rendirte ahora?
            </h2>
            <p className="mt-2 text-muted">
              {`Tu ${STAGE_NAMES[stage].toLowerCase()} no llegará a florecer y no irá al jardín. Lo que estudiaste sigue contando para ti.`}
            </p>
            <button
              type="button"
              className={`${btnPrimary} mt-5 w-full`}
              onClick={() => {
                setGivingUp(false);
                void f.resume();
              }}
            >
              Seguir estudiando
            </button>
            <button
              type="button"
              className={`mt-3 min-h-11 w-full rounded-full font-semibold text-muted hover:text-foreground ${focusRing}`}
              onClick={() => {
                setGivingUp(false);
                void f.finish("abandoned");
              }}
            >
              Sí, terminar
            </button>
          </div>
        </div>
      )}

      {pickerNow !== null && (
        <TaskPicker
          tasks={openTasks}
          selectedId={chosenTask?.id ?? null}
          focusMinutes={settings?.focusMinutes ?? 25}
          now={pickerNow}
          onClose={closePicker}
          onSelect={(task) => {
            if (task && !allTasks.some((t) => t.id === task.id)) {
              setCreated((list) => [...list, task]);
            }
            setTaskId(task?.id ?? null);
            setPickerNow(null);
          }}
        />
      )}
    </section>
  );
}

function TaskSummary({ task }: { task: TaskWithProgress | undefined }) {
  if (!task) {
    return (
      <span className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden="true"
          className="size-3.5 shrink-0 rounded-full border-[1.5px] border-dashed border-ink"
        />
        <span className="truncate font-medium">Sesión libre, sin tarea</span>
      </span>
    );
  }
  const subject = subjectOf(task.subject);
  return (
    <span className="flex min-w-0 flex-1 items-center gap-3">
      <span
        aria-hidden="true"
        className={`size-3.5 shrink-0 rounded-full border-[1.5px] border-ink ${subject?.bg ?? "bg-white"}`}
      />
      <span className="min-w-0">
        <span className="block truncate text-base font-medium">{task.title}</span>
        <span className="block text-[13px] text-muted">
          {[
            subject?.name,
            `${task.completedPomodoros} de ${task.estimatedPomodoros} pomodoros`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
    </span>
  );
}

/** Camino de 6 etapas: completadas en acento, la actual destacada, el resto en `line`. */
function StagePath({ stage }: { stage: number }) {
  const last = STAGE_NAMES.length - 1;
  return (
    <ol
      aria-label="Etapas de la planta"
      className="relative mt-2 flex items-center justify-between px-1"
    >
      <span
        aria-hidden="true"
        className="absolute inset-x-3 top-1/2 h-1 -translate-y-1/2 rounded-full bg-line"
      />
      <span
        aria-hidden="true"
        className="absolute left-3 top-1/2 h-1 -translate-y-1/2 rounded-full bg-accent transition-[width] duration-500"
        style={{ width: `calc((100% - 1.5rem) * ${stage / last})` }}
      />
      {STAGE_NAMES.map((name, i) => {
        const state = i < stage ? "completada" : i === stage ? "actual" : "pendiente";
        return (
          <li
            key={name}
            aria-label={`${name} (${state})`}
            aria-current={i === stage ? "step" : undefined}
            className="relative grid size-[30px] place-items-center"
          >
            {state === "actual" ? (
              <span className="grid size-[30px] place-items-center rounded-full border-[3px] border-accent bg-white">
                <span className="size-3 rounded-full bg-accent" />
              </span>
            ) : (
              <span
                className={`size-[22px] rounded-full ${
                  state === "completada"
                    ? "border-[1.5px] border-ink bg-accent"
                    : "bg-line"
                }`}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
