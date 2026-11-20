/**
 * Única fuente de la identidad de la PWA. Los colores replican la paleta de
 * `src/app/globals.css` (fondo de la app interior; hay un test que lo verifica).
 */
export const PWA = {
  name: "Focus Garden",
  shortName: "Focus Garden",
  description: "Estudiá con Pomodoro y hacé crecer tu planta.",
  lang: "es",
  startUrl: "/focus",
  scope: "/",
  themeColor: "#fbf5ee", // .app-theme --background (paleta Suave)
  backgroundColor: "#fbf5ee", // .app-theme --background
  appleTouchIcon: "/icons/apple-touch-icon.png",
} as const;
