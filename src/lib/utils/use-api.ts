"use client";

import { useEffect, useState } from "react";

/**
 * GET simple con estados de carga/error. `url` null = no pedir todavía.
 * Cambiar `reloadKey` vuelve a pedir la misma URL (conserva los datos anteriores mientras tanto).
 */
export function useApi<T>(url: string | null, reloadKey: string | number = 0) {
  const [result, setResult] = useState<{ url: string; data?: T; error?: string } | null>(
    null,
  );

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    fetch(url, { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error?.message ?? `Error ${res.status}`);
        return body as T;
      })
      .then((data) => !cancelled && setResult({ url, data }))
      .catch((e: Error) => !cancelled && setResult({ url, error: e.message }));
    return () => {
      cancelled = true;
    };
  }, [url, reloadKey]);

  const current = result && result.url === url ? result : null;
  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: !!url && !current,
  };
}

export function browserTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}
