/**
 * Única fuente de la identidad de la PWA. Los colores replican la paleta de
 * `src/app/globals.css` (hay un test que lo verifica).
 */
export const PWA = {
  name: "Focus Garden",
  shortName: "Focus Garden",
  description: "Estudiá con Pomodoro y hacé crecer tu planta.",
  lang: "es",
  startUrl: "/focus",
  scope: "/",
  themeColor: "#3a5f37", // --leaf-strong
  backgroundColor: "#faf6ec", // --background
  appleTouchIcon: "/icons/apple-touch-icon.png",
} as const;
