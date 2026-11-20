import { apiFetch } from "@/lib/http/client";
import type { FocusState, HeartbeatResponse } from "./types";

const BASE = "/api/focus-sessions";

export const focusApi = {
  active: () => apiFetch<FocusState>(`${BASE}/active`),
  start: (taskId: string | null) =>
    apiFetch<FocusState>(BASE, { method: "POST", body: taskId ? { taskId } : {} }),
  heartbeat: (id: string, idempotencyKey: string) =>
    apiFetch<HeartbeatResponse>(`${BASE}/${id}/heartbeat`, {
      method: "POST",
      body: { idempotencyKey },
    }),
  pause: (id: string) => apiFetch<FocusState>(`${BASE}/${id}/pause`, { method: "POST" }),
  resume: (id: string) =>
    apiFetch<FocusState>(`${BASE}/${id}/resume`, { method: "POST" }),
  finish: (id: string, outcome: "completed" | "abandoned") =>
    apiFetch<FocusState>(`${BASE}/${id}/complete`, { method: "POST", body: { outcome } }),
  /** Para `pagehide`: sendBeacon es lo único fiable al cerrar/ocultar en móviles. */
  pauseBeacon: (id: string) => navigator.sendBeacon(`${BASE}/${id}/pause`),
};
