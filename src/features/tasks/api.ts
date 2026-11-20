import { apiFetch } from "@/lib/http/client";
import type { CreateTaskInput, UpdateTaskInput } from "./schema";
import type { TaskWithProgress } from "./types";

type TaskBody = { task: TaskWithProgress };

export const createTask = async (input: Partial<CreateTaskInput>) =>
  (await apiFetch<TaskBody>("/api/tasks", { method: "POST", body: input })).task;

export const updateTask = async (id: string, patch: UpdateTaskInput) =>
  (await apiFetch<TaskBody>(`/api/tasks/${id}`, { method: "PATCH", body: patch })).task;

export const deleteTask = (id: string) =>
  apiFetch<{ deleted: true }>(`/api/tasks/${id}`, { method: "DELETE" });
