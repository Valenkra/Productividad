"use client";

import { useEffect } from "react";

/**
 * Registra el service worker solo en producción y si el navegador lo soporta.
 * En desarrollo desregistra cualquiera que haya quedado: un SW de `npm start` en el mismo
 * puerto serviría /_next/static desde su caché y `next dev` ejecutaría chunks viejos.
 */
export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker
        .getRegistrations?.()
        .then((regs) => Promise.all(regs.map((r) => r.unregister())))
        .catch(() => {});
      return;
    }
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((e: unknown) => console.error("No se pudo registrar el service worker:", e));
  }, []);
  return null;
}
