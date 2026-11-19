"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { dateInputToMs, msToDateInput } from "@/lib/time/format";
import { isOverdue } from "./domain";
import type { Task, TaskPriority, TaskStatus } from "./types";

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "baja",
  medium: "media",
  high: "alta",
};

const input =
  "min-h-12 rounded-lg border border-border bg-surface px-3 text-base focus-visible:outline-2 focus-visible:outline-leaf-strong";
const button =
  "min-h-11 rounded-lg border border-border bg-surface px-3 text-sm focus-visible:outline-2 focus-visible:outline-leaf-strong";

async function request(url: string, method: string, body?: unknown): Promise<void> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Error ${res.status}`);
}

export function TasksView() {
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [sort, setSort] = useState("manual");
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  // "Ahora" se fija al recibir los datos (en el cliente): Date.now() en el render rompe el prerender.
  const [now, setNow] = useState(0);

  const params = new URLSearchParams({ sort });
  if (status) params.set("status", status);
  if (priority) params.set("priority", priority);
  const query = params.toString();

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/tasks?${query}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        return (await res.json()) as { tasks: Task[] };
      })
      .then((body) => {
        if (cancelled) return;
        setTasks(body.tasks);
        setNow(Date.now());
        setLoadError(false);
      })
      .catch(() => !cancelled && setLoadError(true));
    return () => {
      cancelled = true;
    };
  }, [query, version]);

  const mutate = useCallback(async (fn: () => Promise<void>): Promise<boolean> => {
    try {
      await fn();
      setActionError(null);
      setVersion((v) => v + 1);
      return true;
    } catch {
      setActionError("No se pudo guardar el cambio. Probá de nuevo.");
      return false;
    }
  }, []);

  if (tasks === null) {
    return loadError ? (
      <p role="alert">No se pudieron cargar las tareas.</p>
    ) : (
      <p role="status">Cargando tareas…</p>
    );
  }

  const filtered = status !== "" || priority !== "";

  return (
    <section className="mx-auto flex max-w-2xl flex-col gap-5">
      <h1 className="text-2xl font-semibold">Tareas</h1>

      <NewTaskForm
        onCreate={(body) => mutate(() => request("/api/tasks", "POST", body))}
      />

      <div className="grid grid-cols-3 gap-2 text-sm">
        <label className="flex flex-col gap-1">
          Estado
          <select
            aria-label="Filtrar por estado"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={input}
          >
            <option value="">Activas</option>
            <option value="todo">Pendientes</option>
            <option value="in_progress">En curso</option>
            <option value="done">Hechas</option>
            <option value="archived">Archivadas</option>
            <option value="all">Todas</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Prioridad
          <select
            aria-label="Filtrar por prioridad"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={input}
          >
            <option value="">Todas</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Orden
          <select
            aria-label="Ordenar por"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className={input}
          >
            <option value="manual">Manual</option>
            <option value="due">Fecha límite</option>
            <option value="priority">Prioridad</option>
            <option value="created">Más nuevas</option>
          </select>
        </label>
      </div>

      {actionError && (
        <p role="alert" className="text-sm text-soil">
          {actionError}
        </p>
      )}

      {tasks.length === 0 ? (
        <p className="text-sm text-muted">
          {filtered
            ? "No hay tareas con estos filtros."
            : "Todavía no tenés tareas. Agregá la primera arriba."}
        </p>
      ) : (
        <ul aria-label="Tareas" className="flex flex-col gap-2">
          {tasks.map((task) =>
            editingId === task.id ? (
              <EditRow
                key={task.id}
                task={task}
                onCancel={() => setEditingId(null)}
                onSave={async (patch) => {
                  if (
                    await mutate(() => request(`/api/tasks/${task.id}`, "PATCH", patch))
                  ) {
                    setEditingId(null);
                  }
                }}
              />
            ) : (
              <li
                key={task.id}
                data-title={task.title}
                className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3"
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-6 w-6"
                    aria-label={`Marcar como hecha: ${task.title}`}
                    checked={task.status === "done"}
                    onChange={(e) =>
                      mutate(() =>
                        request(`/api/tasks/${task.id}`, "PATCH", {
                          status: e.target.checked ? "done" : "todo",
                        }),
                      )
                    }
                  />
                  <div className="flex-1">
                    <p
                      className={task.status === "done" ? "line-through" : "font-medium"}
                    >
                      {task.title}
                    </p>
                    <p className="text-sm text-muted">
                      Prioridad {PRIORITY_LABEL[task.priority]}
                      {task.dueAt !== null &&
                        ` · Vence ${new Intl.DateTimeFormat("es", { dateStyle: "medium" }).format(task.dueAt)}`}
                      {isOverdue(task, now) && " · ⚠ Vencida"}
                      {task.status === "archived" && " · Archivada"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={button}
                    aria-label={`Editar ${task.title}`}
                    onClick={() => setEditingId(task.id)}
                  >
                    Editar
                  </button>
                  <ArchiveButton task={task} mutate={mutate} />
                  <button
                    className={button}
                    aria-label={`Eliminar ${task.title}`}
                    onClick={() => {
                      if (window.confirm(`¿Eliminar «${task.title}»?`)) {
                        void mutate(() => request(`/api/tasks/${task.id}`, "DELETE"));
                      }
                    }}
                  >
                    Eliminar
                  </button>
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </section>
  );
}

function ArchiveButton({
  task,
  mutate,
}: {
  task: Task;
  mutate: (fn: () => Promise<void>) => Promise<boolean>;
}) {
  const archived = task.status === "archived";
  const next: TaskStatus = archived ? "todo" : "archived";
  return (
    <button
      className={button}
      aria-label={`${archived ? "Desarchivar" : "Archivar"} ${task.title}`}
      onClick={() =>
        mutate(() => request(`/api/tasks/${task.id}`, "PATCH", { status: next }))
      }
    >
      {archived ? "Desarchivar" : "Archivar"}
    </button>
  );
}

function NewTaskForm({
  onCreate,
}: {
  onCreate: (body: {
    title: string;
    priority: TaskPriority;
    dueAt: number | null;
  }) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [due, setDue] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Escribí un título para la tarea.");
      return;
    }
    setError(null);
    if (await onCreate({ title: title.trim(), priority, dueAt: dateInputToMs(due) })) {
      setTitle("");
      setDue("");
      setPriority("medium");
    }
  }

  return (
    <form
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-3"
    >
      <label className="flex flex-col gap-1 text-sm">
        Nueva tarea
        <input
          className={input}
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label className="flex flex-col gap-1">
          Prioridad
          <select
            aria-label="Prioridad de la nueva tarea"
            className={input}
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Fecha límite
          <input
            type="date"
            className={input}
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-soil">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="min-h-12 rounded-xl bg-leaf-strong px-5 text-base font-medium text-white"
      >
        Agregar
      </button>
    </form>
  );
}

function EditRow({
  task,
  onSave,
  onCancel,
}: {
  task: Task;
  onSave: (patch: {
    title: string;
    priority: TaskPriority;
    dueAt: number | null;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [due, setDue] = useState(msToDateInput(task.dueAt));
  const [error, setError] = useState<string | null>(null);

  return (
    <li
      data-title={task.title}
      className="flex flex-col gap-2 rounded-xl border border-leaf bg-surface p-3"
    >
      <label className="flex flex-col gap-1 text-sm">
        Título
        <input
          className={input}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <label className="flex flex-col gap-1">
          Prioridad
          <select
            className={input}
            value={priority}
            onChange={(e) => setPriority(e.target.value as TaskPriority)}
          >
            <option value="low">Baja</option>
            <option value="medium">Media</option>
            <option value="high">Alta</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Fecha límite
          <input
            type="date"
            className={input}
            value={due}
            onChange={(e) => setDue(e.target.value)}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="text-sm text-soil">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          className="min-h-11 rounded-lg bg-leaf-strong px-4 text-sm font-medium text-white"
          onClick={() => {
            if (!title.trim()) {
              setError("El título no puede quedar vacío.");
              return;
            }
            void onSave({ title: title.trim(), priority, dueAt: dateInputToMs(due) });
          }}
        >
          Guardar
        </button>
        <button className={button} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </li>
  );
}
