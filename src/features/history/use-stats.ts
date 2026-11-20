"use client";

import { useState } from "react";
import { browserTimeZone } from "@/lib/time/format";
import { useApi } from "@/lib/utils/use-api";
import type { Stats } from "./stats";

export type StatsResponse = Stats & { plantTotalSeconds: number };

export function useStats() {
  // Se calcula una sola vez en el cliente (en SSR no hay zona del navegador).
  const [tz] = useState<string | null>(() =>
    typeof window === "undefined" ? null : browserTimeZone(),
  );
  const result = useApi<StatsResponse>(
    tz ? `/api/stats?tz=${encodeURIComponent(tz)}` : null,
  );
  // Sin zona (render del servidor) todavía no se pidió nada: es "cargando", no un error.
  // Así el HTML del servidor coincide con el primer render del cliente (sin error de hidratación).
  return tz ? result : { ...result, loading: true };
}
