# Próximos pasos de Focus Garden

Estado a 2026-11-20. Para retomar en una sesión nueva: leer `CLAUDE.md`, `docs/SPEC.md`, `docs/TDD.md` y este archivo.

## Estado actual

- Hechas, todo **local** (sin Supabase): Fases 1 (base), 3 (tareas), 4 (tracking/Pomodoro), 5 (planta), 6 (dashboard/historial/ajustes), 7 (PWA) y la landing en `/`.
- Rediseño «Pastel juguetón» (2b) implementado y commiteado.
- **Orden del repo según `INFORME_DE_FLUJO.md`: hecho** (2026-11-20, ver §1). `npm run verify` limpio: 452 tests, cobertura 97 %, build OK. **Sin commitear** (el usuario hace los commits).
- Usuario fijo `local-user` y persistencia en memoria (se pierde al reiniciar el servidor).

## Reglas que siguen vigentes

- TDD estricto: test rojo primero (mostrar que falla por la razón correcta), verde mínimo, refactor. Un bug empieza con un test que lo reproduce. Nunca debilitar tests.
- Cerrar cada tarea con `npm run verify`. Nunca `Date.now()`/`Math.random()` en el render (rompe `cacheComponents`).
- Las rutas `/api` usan `handle()` de `src/server/http.ts`. Next 16: `proxy.ts`, no `middleware.ts`.
- El cliente habla con la API solo por `apiFetch` (`src/lib/http/client.ts`) y los `features/*/api.ts`.
- Los ajustes del usuario se leen con `useSettings()` (un solo pedido por `SettingsProvider` en `(app)/layout.tsx`); quien guarda ajustes llama `setSettings` con la respuesta.
- Verificar lo visual con capturas Playwright, no solo con tests.
- Entorno Windows: scripts grandes con Write/Edit o `.cjs`; no hay Python; matar servidores solo por PID del puerto (nunca `taskkill /IM node.exe`).

## 0. Rediseño 2b — HECHO

Según `docs/design/README.md` (paleta Suave + Fredoka). Pestañas Foco/Tareas/Jardín/Stats; Ajustes desde el engranaje de Foco; `/dashboard` redirige a `/focus` (también `start_url` de la PWA).

- Modelo: la planta crece dentro de cada pomodoro (`sessionStage`, florece solo al completarse); Jardín = una planta por foco completado (`gardenPlants`); Task con `subject` y `estimatedPomodoros` (`completedPomodoros` derivado de sesiones); ajustes `autoStartBreak`, `sound`, `displayName`, `onboardingDone`.
- Desvíos conscientes: «Meta diaria» se mantiene en Ajustes y en la tarjeta «min hoy»; materias fijas (Cálculo, Química, Historia, Inglés); la planta usa el SVG existente (`PlantIllustration`).
- Pendiente: ilustraciones definitivas por etapa (`/public/plants/stage-N.png`) si se quieren; materias editables; transición en fundido entre etapas.

## 1. Orden del repo (INFORME_DE_FLUJO.md) — HECHO

- Limpieza: SVG de plantilla, `.gitkeep` redundantes, Geist Mono, `ComingSoon`, modelo de crecimiento acumulado (`growthInfo`…), `lib/time` viejo, `nextTask`/`isOverdue`, campos de stats sin uso.
- **Bug corregido:** la landing decía «De semilla a flor: 180 minutos» (modelo viejo); ahora explica que florece en un pomodoro.
- Cliente HTTP único (`apiFetch` + `ApiError`) y `features/{tasks,settings,focus-tracking}/api.ts`.
- `FocusPanel` partido: `focus-view-model.ts` (puro, con tests), `stage-path.tsx`, `give-up-dialog.tsx`, `copy.ts`, `tasks/task-summary.tsx`.
- UI compartida: `BottomSheet`, `Dialog`, `Stepper`, `Switch`; colores sueltos pasados a tokens en `globals.css`.
- Servidor: `SettingsRepository` + `settings-service`, `stats-service`, `garden-service`; `cycleAfter` movido a `pomodoro/sequence.ts`; `createServices()` cablea todo (lo usan el container y los tests).
- `SettingsProvider`: un solo pedido de ajustes y sin parpadeo de Foco antes del onboarding.
- PWA: `theme_color`/`background_color`, `offline.html` y el banner sin conexión con la paleta Suave.
- Decisión: **se mantuvo `plantTotalSeconds`** (total histórico de foco acreditado). No se muestra en la UI, pero los tests de tracking lo usan como invariante (los reintentos no duplican). Si no se va a mostrar, decidir antes de crear las tablas de Supabase.

## 2. Pendientes de diseño

- La landing y `/login` conservan el estilo anterior (verde + Fraunces + Geist). Llevarlas al estilo 2b requiere decisiones de diseño; al hacerlo, quitar Fraunces/Geist de `app/layout.tsx` y los tokens viejos (`--leaf`, `--soil`, `--border`, `--surface`) de `globals.css`.
- Los íconos de la PWA siguen siendo la planta verde (`scripts/generate-icons.mjs`).
- Verificar la landing en Safari y móviles reales.

## 3. Validar la PWA en dispositivos reales

Recorrer el checklist de `docs/PWA-TESTING.md` en Android e iPhone. Lo crítico: bloquear la pantalla debe **pausar** la sesión sin acreditar ese tiempo.

## 4. Fase 2: Supabase + Google OAuth (necesita al usuario)

- El usuario debe crear el proyecto Supabase y dar las claves (`NEXT_PUBLIC_SUPABASE_URL`, anon key, y service role solo en servidor).
- Implementar `SupabaseFocusRepository`, `SupabaseTaskRepository` y `SupabaseSettingsRepository` detrás de las interfaces existentes, sin tocar el dominio; enchufarlos en `src/server/container.ts` (`createServices`).
- Reemplazar el usuario fijo de `src/server/auth.ts` por Supabase Auth; activar el botón de Google de `src/features/auth/login-card.tsx` y proteger rutas con `proxy.ts`. Un 401 se maneja en un solo lugar: `apiFetch`.
- RLS por usuario en todas las tablas; el cliente nunca envía tiempo, solo `idempotencyKey`.
- Mantener las implementaciones en memoria para los tests.

## 5. Fase 8: Deploy

- Plan de costo cero (p. ej. Vercel hobby + Supabase free). El SW solo se registra en producción, y requiere HTTPS.
- Revisar variables de entorno, headers y que `/sw.js` siga sin caché en producción.
- Avisos conocidos del build: `turbopack.root` / `outputFileTracingRoot` por un `package-lock.json` en `C:\Users\vvugin`.

## Pendientes menores

- Opcional: renombrar `/history` a `/stats` (dejando redirección) y un helper `withUser` para las rutas con `[id]`.
- Fuera de alcance por spec: push, sync en segundo plano, Apple Sign In, tracking con pantalla bloqueada.
