"use client";

import { useState } from "react";
import { browserTimeZone, useApi } from "@/lib/utils/use-api";
import type { Stats } from "./stats";

export type StatsResponse = Stats & { plantTotalSeconds: number };

export function useStats() {
  // Se calcula una sola vez en el cliente (en SSR no hay zona del navegador).
  const [tz] = useState<string | null>(() =>
    typeof window === "undefined" ? null : browserTimeZone(),
  );
  return useApi<StatsResponse>(tz ? `/api/stats?tz=${encodeURIComponent(tz)}` : null);
}
