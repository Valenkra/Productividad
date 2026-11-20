"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/http/client";

type Result<T> = { url: string; data?: T; error?: string; receivedAt: number };

/**
 * GET simple con estados de carga/error. `url` null = no pedir todavía.
 * Cambiar `reloadKey` vuelve a pedir la misma URL (conserva los datos anteriores mientras
 * tanto, y también si la recarga falla). `receivedAt` es el epoch ms en que llegó la
 * respuesta: sirve como "ahora" sin llamar a `Date.now()` durante el render.
 */
export function useApi<T>(url: string | null, reloadKey: string | number = 0) {
  const [result, setResult] = useState<Result<T> | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    apiFetch<T>(url)
      .then((data) => !cancelled && setResult({ url, data, receivedAt: Date.now() }))
      .catch(
        (e: Error) =>
          !cancelled &&
          setResult((prev) => ({
            url,
            data: prev?.url === url ? prev.data : undefined,
            error: e.message,
            receivedAt: Date.now(),
          })),
      );
    return () => {
      cancelled = true;
    };
  }, [url, reloadKey]);

  const current = result && result.url === url ? result : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: !!url && !current,
    receivedAt: current?.receivedAt ?? 0,
  };
}
