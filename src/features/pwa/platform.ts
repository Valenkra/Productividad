export type Platform = "ios" | "android" | "other";

/**
 * iPadOS 13+ se anuncia como Mac: se distingue por la pantalla táctil
 * (un Mac real no tiene puntos táctiles).
 */
export function detectPlatform(userAgent: string, maxTouchPoints: number): Platform {
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "ios";
  if (/Macintosh/i.test(userAgent) && maxTouchPoints > 1) return "ios";
  if (/Android/i.test(userAgent)) return "android";
  return "other";
}
