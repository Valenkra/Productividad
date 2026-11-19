"use client";

import { useSyncExternalStore } from "react";
import { subscribeOnline } from "./browser-signals";

/** Estado de conexión del navegador (en el servidor se asume online). */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}
