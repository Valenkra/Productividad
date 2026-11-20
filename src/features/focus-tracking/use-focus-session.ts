"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { getAttention, subscribeAttention } from "@/lib/utils/browser-signals";
import { useOnline } from "@/lib/utils/use-online";
import { focusApi } from "./api";
import { HEARTBEAT_INTERVAL_SECONDS, MAX_CREDIT_SECONDS } from "./config";
import type { FocusState, HeartbeatResponse } from "./types";

export function useFocusSession() {
  const [state, setState] = useState<FocusState | null>(null);
  const [syncedAt, setSyncedAt] = useState(0);
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const attentive = useSyncExternalStore(subscribeAttention, getAttention, () => true);
  const online = useOnline();

  const pendingKey = useRef<string | null>(null);
  const inFlight = useRef(false);

  const apply = useCallback((next: FocusState) => {
    setState(next);
    const t = performance.now();
    setSyncedAt(t);
    setNow(t);
  }, []);

  const session = state?.session ?? null;
  const open = session?.status === "active" || session?.status === "paused";
  const counting = session?.status === "active" && attentive && online;

  // Carga inicial: el estado real del servidor manda, nunca el reloj local.
  useEffect(() => {
    let cancelled = false;
    focusApi
      .active()
      .then((s) => !cancelled && apply(s))
      .catch((e: Error) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [apply]);

  // Reloj visual: solo avanza mientras se cuenta y nunca más allá de lo que el servidor toleraría.
  useEffect(() => {
    if (!counting) return;
    const id = setInterval(() => setNow(performance.now()), 1000);
    return () => clearInterval(id);
  }, [counting]);

  const sessionId = session?.id;

  const sendHeartbeat = useCallback(async () => {
    if (!sessionId || inFlight.current) return;
    inFlight.current = true;
    const key = (pendingKey.current ??= crypto.randomUUID());
    try {
      const res: HeartbeatResponse = await focusApi.heartbeat(sessionId, key);
      pendingKey.current = null; // confirmado: la próxima vez, clave nueva
      apply(res);
      setError(null);
      if (res.result === "stale_paused") {
        setNotice(
          "La sesión se pausó porque no se pudo confirmar el tiempo. Reanudala para seguir.",
        );
      }
    } catch {
      // Se conserva la clave: el reintento no duplica. El tiempo no confirmado no se cuenta.
      setError("No se pudo confirmar el tiempo con el servidor. Reintentando…");
    } finally {
      inFlight.current = false;
    }
  }, [sessionId, apply]);

  useEffect(() => {
    if (!counting) return;
    const id = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_SECONDS * 1000);
    return () => clearInterval(id);
  }, [counting, sendHeartbeat]);

  const run = useCallback(
    async (call: () => Promise<FocusState>) => {
      try {
        apply(await call());
        setError(null);
        setNotice(null);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [apply],
  );

  // Perder visibilidad o foco pausa la sesión (el servidor además vence por timeout).
  const status = session?.status;
  useEffect(() => {
    if (!sessionId || status !== "active") return;
    const onChange = () => {
      if (getAttention()) return;
      void run(() => focusApi.pause(sessionId)).then(() =>
        setNotice("Pausamos la sesión porque saliste de la app. Volvé y reanudá."),
      );
    };
    const unsubscribe = subscribeAttention(onChange);
    const initial = setTimeout(onChange, 0); // por si ya se cargó sin foco
    return () => {
      clearTimeout(initial);
      unsubscribe();
    };
  }, [sessionId, status, run]);

  // pagehide: sendBeacon es lo único fiable al cerrar/ocultar en móviles.
  useEffect(() => {
    if (!sessionId || status !== "active") return;
    const onHide = () => focusApi.pauseBeacon(sessionId);
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [sessionId, status]);

  const credited = session?.creditedSeconds ?? 0;
  const planned = session?.plannedSeconds ?? 0;
  const ahead = counting ? Math.min((now - syncedAt) / 1000, MAX_CREDIT_SECONDS) : 0;
  const displayedSeconds = Math.min(planned, Math.floor(credited + ahead));

  return {
    loading,
    error,
    notice,
    state,
    session,
    open,
    counting,
    attentive,
    online,
    displayedSeconds,
    remainingSeconds: Math.max(0, planned - displayedSeconds),
    start: (taskId?: string | null) => run(() => focusApi.start(taskId ?? null)),
    pause: () => sessionId && run(() => focusApi.pause(sessionId)),
    resume: () => sessionId && run(() => focusApi.resume(sessionId)),
    finish: (outcome: "completed" | "abandoned") =>
      sessionId && run(() => focusApi.finish(sessionId, outcome)),
  };
}
