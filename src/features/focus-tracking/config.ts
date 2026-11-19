/** El cliente envía un heartbeat cada 15 s mientras la app está visible y enfocada. */
export const HEARTBEAT_INTERVAL_SECONDS = 15;

/**
 * Máximo de segundos que un solo heartbeat puede acreditar, y tiempo sin heartbeats
 * a partir del cual el servidor pausa la sesión. = 2 intervalos: tolera UN heartbeat
 * perdido o tardío (red lenta) sin regalar tiempo si el usuario se fue. Ante la duda
 * se prefiere NO acreditar (el tiempo no verificado se pierde, nunca se inventa).
 */
export const MAX_CREDIT_SECONDS = 2 * HEARTBEAT_INTERVAL_SECONDS;
export const STALE_TIMEOUT_MS = MAX_CREDIT_SECONDS * 1000;

/** Heartbeats más seguidos que esto se ignoran (sin avanzar el cursor). */
export const MIN_HEARTBEAT_SPACING_MS = 5_000;
