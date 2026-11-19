/**
 * Señales del navegador que usa el producto para decidir si "cuenta" el tiempo:
 * la app debe estar visible, con foco y con conexión. Funciones puras de suscripción,
 * pensadas para `useSyncExternalStore`.
 */

const ATTENTION_EVENTS = ["visibilitychange", "focus", "blur", "pageshow", "pagehide"];

export function subscribeAttention(cb: () => void): () => void {
  ATTENTION_EVENTS.forEach((e) => window.addEventListener(e, cb));
  document.addEventListener("visibilitychange", cb);
  return () => {
    ATTENTION_EVENTS.forEach((e) => window.removeEventListener(e, cb));
    document.removeEventListener("visibilitychange", cb);
  };
}

/** Visible y con foco (`document.hasFocus()` en la medida en que el navegador lo permita). */
export const getAttention = (): boolean =>
  document.visibilityState === "visible" && document.hasFocus();

export function subscribeOnline(cb: () => void): () => void {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
