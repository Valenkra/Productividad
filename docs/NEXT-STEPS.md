# Próximos pasos de Focus Garden

Estado a 2026-11-20. Para retomar en una sesión nueva: leer `CLAUDE.md`, `docs/SPEC.md`, `docs/TDD.md` y este archivo.

## Estado actual

- Hechas, todo **local** (sin Supabase): Fases 1 (base), 3 (tareas), 4 (tracking/Pomodoro), 5 (planta), 6 (dashboard/historial/ajustes), 7 (PWA) y la landing en `/`.
- `npm run verify` limpio: 339 tests, cobertura ~99 % líneas, build OK. `npm run test:e2e` 7/7 (Playwright, build real, puerto 3112).
- Los cambios de pulido (secciones 1 y 2) están hechos pero **sin commitear**.
- Usuario fijo `local-user` y persistencia en memoria (se pierde al reiniciar el servidor).

## Reglas que siguen vigentes

- TDD estricto: test rojo primero (mostrar que falla por la razón correcta), verde mínimo, refactor. Un bug empieza con un test que lo reproduce. Nunca debilitar tests.
- Cerrar cada tarea con `npm run verify`. Nunca `Date.now()`/`Math.random()` en el render (rompe `cacheComponents`).
- Las rutas `/api` usan `handle()` de `src/server/http.ts`. Next 16: `proxy.ts`, no `middleware.ts`.
- Verificar lo visual con capturas Playwright, no solo con tests.
- Entorno Windows: scripts grandes con Write/Edit o `.cjs`; no hay Python; matar servidores solo por PID del puerto (nunca `taskkill /IM node.exe`).

## 1. Pulir la app interior — HECHO (2026-11-20)

Fraunces, resplandor, tarjetas redondeadas y botones píldora llevados a Inicio, Foco, Jardín, Historial, Ajustes, Tareas y la navegación (barra flotante en móvil, barra lateral con logo en escritorio). Planta protagonista en Foco, Jardín e Inicio. Verificado con capturas a 390×844 y 1280×800, sin scroll horizontal.

## 2. Ajustes de la landing — HECHO salvo Safari/móviles reales

- El botón «Crear mi cuenta gratis» ahora va antes de la demo y queda sobre el pliegue en móvil.
- `PlantIllustration` acepta `fit`: recorta el vacío de las etapas tempranas (mismo aspecto, anclado a la maceta). Lo usan la demo, Foco, Jardín e Inicio.
- **Pendiente:** verificar en Safari y móviles reales.

## 3. Validar la PWA en dispositivos reales

Recorrer el checklist de `docs/PWA-TESTING.md` en Android e iPhone. Lo crítico: bloquear la pantalla debe **pausar** la sesión sin acreditar ese tiempo.

## 4. Fase 2: Supabase + Google OAuth (necesita al usuario)

- El usuario debe crear el proyecto Supabase y dar las claves (`NEXT_PUBLIC_SUPABASE_URL`, anon key, y service role solo en servidor).
- Implementar `SupabaseFocusRepository` y `SupabaseTaskRepository` detrás de las interfaces existentes (`FocusRepository`, `TaskRepository`), sin tocar el dominio.
- Reemplazar el usuario fijo de `src/server/auth.ts` por Supabase Auth; activar el botón de Google de `src/features/auth/login-card.tsx` (hoy deshabilitado con aviso) y proteger rutas con `proxy.ts`.
- RLS por usuario en todas las tablas; el cliente nunca envía tiempo, solo `idempotencyKey`.
- Mantener las implementaciones en memoria para los tests.

## 5. Fase 8: Deploy

- Plan de costo cero (p. ej. Vercel hobby + Supabase free). El SW solo se registra en producción, y requiere HTTPS.
- Revisar variables de entorno, headers y que `/sw.js` siga sin caché en producción.
- Avisos conocidos del build: `turbopack.root` / `outputFileTracingRoot` por un `package-lock.json` en `C:\Users\vvugin`.

## Pendientes menores

- Considerar commitear en partes (landing, PWA, tareas, tracking).
- Fuera de alcance por spec: push, sync en segundo plano, Apple Sign In, tracking con pantalla bloqueada.
