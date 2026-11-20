"use client";

import { Settings, SkipForward } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { btnPrimary, btnRound, btnSecondary, focusRing } from "@/components/ui/styles";
import { STAGE_NAMES } from "@/features/garden/growth";
import { PlantIllustration } from "@/features/garden/plant-illustration";
import { useSettings } from "@/features/settings/settings-context";
import { isOpenTask } from "@/features/tasks/domain";
import { TaskPicker } from "@/features/tasks/task-picker";
import { TaskSummary } from "@/features/tasks/task-summary";
import type { TaskWithProgress } from "@/features/tasks/types";
import { formatClock } from "@/lib/time/format";
import { playChime } from "@/lib/utils/chime";
import { useApi } from "@/lib/utils/use-api";
import { focusViewModel } from "./focus-view-model";
import { GiveUpDialog } from "./give-up-dialog";
import { StagePath } from "./stage-path";
import { useFocusSession } from "./use-focus-session";

export function FocusPanel() {
  const f = useFocusSession();
  const search = useSearchParams();
  const { settings } = useSettings();
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
  const vm = focusViewModel({
    open,
    nextMode: f.state.nextMode,
    nextPlannedSeconds: f.state.nextPlannedSeconds,
    cycleFocusCount: f.state.cycleFocusCount,
    displayedSeconds: f.displayedSeconds,
    remainingSeconds: f.remainingSeconds,
    counting: f.counting,
    online: f.online,
    settings,
  });
  const { isBreak, stage, running } = vm;

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
          <p className="truncate text-sm font-medium text-muted">{vm.greeting}</p>
          <h1 className="text-[26px] font-semibold leading-tight">{vm.title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            aria-label={`Pomodoro ${vm.cycleNow} de ${vm.cycleSize}`}
            className="rounded-full border-[1.5px] border-ink bg-white px-3 py-1 text-sm font-semibold shadow-[0_3px_0_var(--ink)]"
          >
            {`${vm.cycleNow}/${vm.cycleSize}`}
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
          isBreak ? "bg-rest-card" : "bg-mint"
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

      {vm.breakTip ? (
        <p className="rounded-[18px] bg-white px-4 py-3 text-center text-[15px] font-medium">
          {vm.breakTip}
        </p>
      ) : (
        <StagePath stage={stage} />
      )}

      <div className="text-center">
        <p
          role="timer"
          aria-label={`Quedan ${formatClock(vm.remaining)}`}
          className="text-[84px] font-semibold leading-none tabular-nums sm:text-[92px]"
        >
          {formatClock(vm.remaining)}
        </p>
        <p aria-live="polite" className="mt-1 text-[15px] text-muted">
          {vm.hint}
        </p>
        <p role="status" aria-label="Estado de la sesión" className="sr-only">
          {vm.stateText}
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
            className={`flex items-center gap-3 rounded-[20px] bg-lilac px-3.5 py-2.5 text-left transition-colors hover:bg-rest-card ${focusRing}`}
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
        <GiveUpDialog
          stageName={STAGE_NAMES[stage]}
          onKeepGoing={() => {
            setGivingUp(false);
            void f.resume();
          }}
          onGiveUp={() => {
            setGivingUp(false);
            void f.finish("abandoned");
          }}
        />
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
