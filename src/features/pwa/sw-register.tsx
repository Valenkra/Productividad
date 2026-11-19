"use client";

import { useEffect } from "react";

/** Registra el service worker solo en producción y si el navegador lo soporta. */
export function SwRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((e: unknown) => console.error("No se pudo registrar el service worker:", e));
  }, []);
  return null;
}
