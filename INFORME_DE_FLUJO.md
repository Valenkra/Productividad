# Informe de flujo y orden del repositorio — Focus Garden

Fecha: 2026-11-20 · Commit evaluado: `36b7705` (árbol limpio)

> **Estado:** las sugerencias de este informe ya están implementadas (sin commitear). El detalle,
> los desvíos y lo que quedó pendiente están en `docs/NEXT-STEPS.md` §1–2. Este documento
> describe el estado **anterior** a esos cambios; los diagramas de flujo de §2 siguen valiendo,
> con `settings`/`stats`/`garden` como servicios propios y `createServices()` en el container.

Estado de partida comprobado: `npm run lint`, `npm run typecheck` y `npm test` sin errores
(41 archivos, **444 tests en verde**). No se corrió `build` ni e2e para este informe.

---

## 1. Resumen

| Aspecto | Nota | Comentario corto |
| --- | --- | --- |
| Estructura de carpetas | 8/10 | Por dominio (`features/*`) + capa `server/` bien separada. Coincide con la SPEC. |
| Separación de capas | 8/10 | Dominio puro, servicios con reloj inyectado, repositorios detrás de interfaces. Una fuga: el cliente importa tipos de `server/`. |
| Tests | 9/10 | Cobertura alta, por capa, sin tiempo real. Es lo más sólido del repo. |
| Código muerto / archivos de más | 5/10 | Quedó bastante del modelo previo al rediseño 2b y de la plantilla de Next. |
| Duplicación | 6/10 | Cliente HTTP, formato `mm:ss`, «tarea abierta», hojas inferiores y estilos repetidos. |
| Tamaño de archivos | 7/10 | `focus-panel.tsx` (430 líneas) y `focus-service.ts` (276) concentran demasiado. |
| Documentación | 6/10 | SPEC/TDD muy buenos; README de plantilla y notas desactualizadas. |

**Global: ~7/10.** La base está bien ordenada. El desorden viene de que el rediseño 2b
cambió el modelo (de planta acumulada a planta por pomodoro) y no se limpió lo anterior.
Hay que ordenarlo **antes** de la Fase 2 (Supabase): todo lo que sobre en los repositorios
y servicios se convierte después en tablas y SQL que nadie usa.

---

## 2. Cómo funciona el flujo

### 2.1 Mapa de capas

```
Navegador (React, "use client")
  src/app/(grupo)/ruta/page.tsx       ← solo monta el componente de la feature
  src/features/<feature>/*-view.tsx   ← UI + estado local
  src/features/<feature>/use-*.ts     ← hooks (fetch, timers, señales del navegador)
        │ fetch JSON
        ▼
Servidor (Route Handlers de Next 16)
  src/app/api/**/route.ts             ← handle() + requireUserId() + parseBody(zod)
  src/server/http.ts                  ← connection(), errores → HTTP (DomainError/ZodError/500)
  src/server/auth.ts                  ← hoy: usuario fijo "local-user"
  src/server/container.ts             ← singletons en globalThis; conecta tareas ↔ foco
  src/server/services/*-service.ts    ← orquestación; recibe now/newId por inyección
        │
        ├─► src/features/*/domain.ts, stats.ts, plants.ts, sequence.ts, growth.ts
        │      (reglas de negocio PURAS, sin reloj ni I/O)
        └─► src/server/repositories/*   ← interfaz FocusRepository/TaskRepository
               memory-*-repository.ts   ← implementación en memoria (se pierde al reiniciar)
```

### 2.2 Rutas de la app

| URL | Página | Componente | APIs que llama |
| --- | --- | --- | --- |
| `/` | `app/page.tsx` | `LandingPage` + `MiniFocusDemo` (demo 100 % local) | ninguna |
| `/login` | `(auth)/login` | `LoginCard` (Google deshabilitado) | ninguna |
| `/onboarding` | `(onboarding)/onboarding` | `OnboardingFlow` | `PATCH /api/settings` |
| `/focus` | `(app)/focus` | `FocusPanel` + `useFocusSession` + `TaskPicker` | `/api/focus-sessions/*`, `/api/settings`, `/api/tasks` |
| `/tasks` | `(app)/tasks` | `TasksView` + `TaskSheet` | `/api/tasks`, `/api/settings` |
| `/garden` | `(app)/garden` | `GardenView` | `/api/garden` |
| `/history` (pestaña «Stats») | `(app)/history` | `StatsView` | `/api/stats?tz=`, `/api/tasks?status=all` |
| `/settings` | `(app)/settings` | `SettingsForm` + `InstallHelp` | `/api/settings` |
| `/dashboard` | redirección a `/focus` | — | — |

Todo lo de `(app)` pasa por `(app)/layout.tsx` → `OnboardingGate` (si
`onboardingDone === false` hace `router.replace("/onboarding")`) + `AppNav` (barra inferior).
El layout raíz monta `OfflineBanner` y `SwRegister` (el service worker solo se registra en producción).

### 2.3 Flujo principal: un pomodoro

```
[Empezar] → POST /api/focus-sessions {taskId?}
   focus-service.start: rechaza si ya hay sesión abierta (409) o la tarea no es del usuario (404)
   nextMode(ciclo, lastMode, ajustes) decide foco / descanso corto / largo
   createSession(...) → repo.insertSession → devuelve FocusState

Mientras la pestaña está visible + con foco + online (useFocusSession):
   cada 15 s  → POST /:id/heartbeat {idempotencyKey}
      reconcile(): si pasaron > 30 s sin heartbeat → se pausa sola (no acredita)
      findInterval(clave) → si existe es reintento: "duplicate", no acredita de nuevo
      applyHeartbeat(): acredita min(segundos reales, 30, lo que falta)
      repo.creditInterval (sesión + intervalo + total + ciclo, atómico)
      si llegó al tiempo planeado → status "completed" → cycleAfter() avanza el ciclo
   el reloj visual adelanta como mucho 30 s sobre lo confirmado (nunca inventa tiempo)

Perder foco/visibilidad → POST /:id/pause   (pagehide → navigator.sendBeacon)
[Seguir]               → POST /:id/resume  (mueve el cursor a "ahora": lo perdido no cuenta)
[Rendirse] / [Saltar]  → POST /:id/complete {outcome:"abandoned"}

Al completarse en pantalla (FocusPanel): sonido + descanso automático si autoStartBreak.
```

Efectos de un foco completado en el resto de la app (se calculan al leer, no se guardan):

- **Tareas**: `completedPomodoros` = `completedFocusByTask(sesiones)` (inyectado en `TaskService` desde `container.ts`).
- **Jardín**: `gardenPlants(sesiones, tareas)` → una planta por foco completado.
- **Stats**: `computeStats(sesiones, intervalos, tz, now)`.

### 2.4 Dependencias entre servicios

`container.ts` cablea las dos features sin que se importen entre sí:

```
TaskService  ──completedByTask──► FocusRepository.listSessions
FocusService ──ownsTask, describeTasks──► TaskService
```

Es un buen diseño (evita ciclos). El único punto flojo es que `FocusService` hoy hace
cuatro trabajos distintos (ver §4.6).

---

## 3. Archivos y código de más

### 3.1 Archivos que se pueden borrar sin tocar comportamiento

| Archivo | Motivo |
| --- | --- |
| `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | Plantilla de `create-next-app`; nadie los referencia. |
| `.gitkeep` en carpetas que **ya tienen archivos**: `components/ui`, `components/feedback`, `features/{auth,focus-tracking,garden,history,pomodoro,settings}`, `lib/time`, `lib/validation`, `server/repositories`, `server/services`, `tests/integration`, `tests/e2e` | Solo sirven en carpetas vacías. Mantener los de `public/plants`, `supabase/migrations`, `lib/supabase`, `src/types`. |
| `src/components/feedback/coming-soon.tsx` (+ `tests/components/coming-soon.test.tsx`) | Ya no lo usa ninguna página (todas las secciones existen). |

### 3.2 Código muerto dentro de archivos que sí se usan

Solo lo usan los tests; ningún código de producción lo llama:

| Dónde | Qué | Comentario |
| --- | --- | --- |
| `features/garden/growth.ts` | `growthInfo`, `growthStage`, `growthUnits`, `partialSeconds`, `STAGE_THRESHOLDS`, `SECONDS_PER_GROWTH_UNIT` | Modelo viejo de «planta por minutos acumulados». En 2b la planta crece por pomodoro (`sessionStage`). |
| Servidor | `plantTotalSeconds` en `UserProgress`, `CreditInput.plantSeconds`, respuesta de `getGarden`, `getStats`, `FocusState` | Se calcula y se guarda en cada heartbeat, pero **ninguna pantalla lo muestra**. Si no se va a usar, conviene sacarlo antes de diseñar las tablas de Supabase. |
| `lib/time/format.ts` | `formatMinutes`, `formatDayLabel`, `dateInputToMs`, `msToDateInput` | El archivo entero queda sin uso (el selector de fecha se reemplazó por chips). |
| `features/tasks/domain.ts` | `nextTask`, `isOverdue` | Sin uso desde que se fusionó «Inicio» con «Foco». |
| `features/history/stats.ts` | `recentSessions`, `weekFocusSeconds`, `totalFocusSeconds`, `today.sessions`, `today.goalProgress` | La API los devuelve, `StatsView` no los usa. |
| `features/focus-tracking/types.ts` | `HeartbeatStatus` | Nadie lo importa; `focus-service.ts` repite la misma unión a mano. |
| `server/services/focus-service.ts` | `export { DomainError }` | Re-exportación que nadie usa. |
| `components/ui/styles.ts` | `${""}` al final de `field` | Resto de una edición. |
| `next.config.ts` | `/* config options here */` | Comentario de plantilla. |

> ⚠️ **Sobre TDD:** borrar una función muerta implica borrar sus tests. Eso no es
> «borrar un test para que pase» (regla 5 del CLAUDE.md): es sacar una funcionalidad que
> ya no existe. Hacerlo en un commit aparte y decirlo en el mensaje, p. ej.
> `chore: quitar modelo de crecimiento acumulado (reemplazado por sessionStage)`.

### 3.3 Fuentes y estilos que sobran o chocan

- `app/layout.tsx` descarga **4 fuentes**: Geist, Geist Mono, Fraunces y Fredoka.
  - **Geist Mono** no se usa en ningún lado → quitarla.
  - **Geist** queda tapada por `.app-theme` en la app interior; solo la ve la landing/login.
- Conviven **dos sistemas visuales**: verde + Fraunces (landing, `/login`, `OfflineBanner`,
  `offline.html`, `theme_color` de la PWA `#3a5f37`) y pastel + Fredoka (app interior).
  Consecuencias que se ven hoy:
  - El banner «Sin conexión» sale **verde** encima de la app pastel.
  - La barra de estado de la PWA instalada es verde y la app es pastel.
  - Decidir: o se lleva la landing al estilo 2b (ya está anotado como pendiente en
    `NEXT-STEPS.md`), o al menos `OfflineBanner` y `PWA.themeColor` pasan a la paleta nueva.
- `globals.css` mantiene los tokens viejos (`--leaf`, `--soil`, `--border`, `--surface`)
  junto con los nuevos. Cuando se unifique el estilo, borrar los que queden sin uso.

### 3.4 Dependencias

- `@supabase/ssr` y `@supabase/supabase-js` están instaladas y no se importan.
  Es esperable (Fase 2), solo tenerlo presente.

### 3.5 Documentación desactualizada

| Archivo | Problema |
| --- | --- |
| `README.md` | Es el de `create-next-app` (dice que se edite `app/page.tsx`). Reemplazarlo por: qué es Focus Garden, cómo correrlo, comandos, y enlaces a `docs/`. |
| `docs/NEXT-STEPS.md` | Dice «el rediseño está **sin commitear**» (ya está commiteado) y «442 tests» (hoy 444). La sección 1 describe el estilo Fraunces, que ya se reemplazó: se puede borrar. |
| `docs/design/README.md` | Menciona `src/features/history/dashboard-view.tsx`, que no existe (es `stats-view.tsx`). |
| `docs/SPEC.md` §4 | Estructura con `middleware.ts` (en Next 16 es `proxy.ts`), `api/heartbeat/` (en realidad es `focus-sessions/[id]/heartbeat`) y sin `features/onboarding`, `landing`, `pwa`. Agregar una nota «ver estructura real en INFORME/README» o actualizar el árbol. |
| `.gitignore` | `.env*` y `/coverage` aparecen dos veces. |

`docs/design/support.js` + `image-slot.js` (~130 KB de runtime de terceros) están bien
ignorados por ESLint. Se pueden quedar como referencia; si molestan, moverlos fuera del repo.

---

## 4. Modularización: qué separar en su propio archivo

Ordenado de mayor a menor impacto.

### 4.1 Cliente HTTP único (duplicado 7+ veces)

Hoy hay un `fetch` armado a mano en `use-focus-session.ts` (función `api`), `use-api.ts`,
`garden-view.tsx`, `tasks-view.tsx` (×2), `task-sheet.tsx`, `settings-form.tsx` y
`onboarding-flow.tsx`. Cada uno maneja errores distinto (algunos leen
`body.error.message`, otros tiran `new Error()` vacío).

Propuesta:

```
src/lib/http/client.ts
  export class ApiError extends Error { status; code }
  export async function apiFetch<T>(path, { method, body }?): Promise<T>
     // headers JSON, cache no-store, lee { error: { code, message } } del servidor

src/features/tasks/api.ts        listTasks, createTask, updateTask, deleteTask
src/features/settings/api.ts     getSettings, patchSettings
src/features/focus-tracking/api.ts  startSession, heartbeat, pause, resume, finish, getActive
src/features/garden/api.ts       getGarden
```

`useApi` pasa a usar `apiFetch`, y `GardenView`/`TasksView` usan `useApi` en vez de su
propio `useEffect` + `fetch`. Un solo sitio para agregar, en la Fase 2, la respuesta 401 → `/login`.

### 4.2 Tipos del contrato cliente/servidor

`use-focus-session.ts` (cliente) importa `FocusState` y `HeartbeatResponse` desde
`@/server/services/focus-service`. Es solo `import type` y no rompe el build, pero el
cliente queda acoplado a un archivo del servidor. Moverlos a
`features/focus-tracking/types.ts` (junto con `HeartbeatStatus`, sin duplicar la unión) y que
el servicio los importe de ahí.

### 4.3 Partir `focus-panel.tsx` (430 líneas)

Mezcla lógica de presentación, tres subcomponentes y un diálogo. Propuesta:

| Archivo nuevo | Contenido |
| --- | --- |
| `focus-tracking/focus-view-model.ts` | Función pura `focusViewModel({ state, settings, displayed, counting, online })` → `mode`, `isBreak`, `stage`, `greeting`, `hint`, `stateText`, `cycleNow/cycleSize`. Se testea en `tests/unit` sin React (como ya se hizo con `stats-view-model.ts`). |
| `focus-tracking/copy.ts` | `MODE_LABEL`, `BREAK_TIP`. |
| `focus-tracking/stage-path.tsx` | `StagePath`. |
| `focus-tracking/give-up-dialog.tsx` | Diálogo «¿Rendirte ahora?». |
| `tasks/task-summary.tsx` | `TaskSummary` (es de tareas, no de foco). |

`FocusPanel` quedaría en ~150 líneas de composición.

### 4.4 Helpers repetidos

| Repetido | Dónde | Destino |
| --- | --- | --- |
| `mmss()` | `focus-panel.tsx`, `mini-focus-demo.tsx` | `lib/time/format.ts` → `formatClock(seconds)` (el archivo ya existe y hoy no se usa). |
| `t.status === "todo" \|\| t.status === "in_progress"` | `focus-panel`, `tasks-view`, `tasks/domain` (×3), `tasks/due` | `isOpenTask(t)` exportado desde `tasks/domain.ts`. |
| Línea «Materia · 2 de 4 pomodoros» | `TaskSummary` y `task-picker.tsx` | `taskMeta(task)` en `tasks/` o un componente `<TaskMeta>`. |
| `browserTimeZone()` | vive en `lib/utils/use-api.ts` | Pertenece a `lib/time/`. |

### 4.5 Componentes de UI compartidos

- **Hoja inferior / diálogo**: `TaskSheet`, `TaskPicker` y el diálogo de rendirse repiten
  overlay `rgba(74,61,85,0.45)`, `role="dialog"`, cierre con Escape y clic afuera.
  → `components/ui/bottom-sheet.tsx` y `components/ui/dialog.tsx`.
- **Contador −/+**: está en `SettingsForm` (5 filas) y en `TaskSheet` (pomodoros) con estilos
  distintos. → `components/ui/stepper.tsx`.
- **Interruptor**: `components/ui/switch.tsx` (hoy está en línea en `SettingsForm`).
- **`settings-form.tsx` no usa `styles.ts`**: define su propio `card` con `border-2` (el resto
  de la app usa `1.5px`), y el botón «Volver» repite a mano `btnRound`. Es una inconsistencia
  visual real, no solo de código.
- Colores sueltos (`#f7e3da`, `#fbe9db`, `#c9b8d6`, `#e3dcf3`, `#f6ece4`, `#7fcf9f`,
  `#fbe3d4`…) aparecen en varios componentes. Pasarlos a tokens en `globals.css`
  (`--peach` ya existe y vale `#f7e3da`, por ejemplo).

### 4.6 Partir `focus-service.ts` (importante antes de Supabase)

Hoy `FocusService` maneja **sesiones + ajustes + estadísticas + jardín**, y
`FocusRepository` guarda también los ajustes del usuario. En Supabase serán tablas distintas
(`focus_sessions`, `pomodoro_settings`/`profiles`), así que conviene separarlo ya:

```
server/repositories/settings-repository.ts     getSettings / saveSettings
server/services/settings-service.ts            getSettings / updateSettings
server/services/stats-service.ts               getStats (usa listSessions/listIntervals)
server/services/garden-service.ts              getGarden (o junto a stats)
server/services/focus-service.ts               start / heartbeat / pause / resume / finish / getActive
```

Además, `cycleAfter()` es una regla de negocio pura que vive dentro del servicio. Moverla a
`features/pomodoro/sequence.ts`, junto a `nextMode()`, con sus propios tests unitarios.

Las rutas `/api/settings`, `/api/stats` y `/api/garden` solo cambian a qué getter del
`container` llaman.

### 4.7 Mejoras menores

- `OnboardingGate`, `FocusPanel` y `TasksView` piden `/api/settings` cada uno por su cuenta
  (2–3 pedidos iguales al abrir `/focus`). Un `SettingsProvider` en `(app)/layout.tsx`
  (contexto con los ajustes y `patch`) lo resuelve y también evita el parpadeo: hoy el gate
  muestra la pantalla de Foco un instante antes de redirigir al onboarding.
- Las rutas con `[id]` repiten `ctx: { params: Promise<{ id: string }> }` y
  `requireUserId()`. Se podría hacer un helper `withUser((userId, req, params) => …)` en
  `server/http.ts`. Es opcional: hoy son 6 líneas por ruta y se leen bien.
- La URL `/history` muestra «Stats/Estadísticas». Si se quiere coherencia, renombrar a
  `/stats` (dejando `/history` como redirección, igual que `/dashboard`).

---

## 5. Lo que está bien y conviene mantener

- Dominio **puro** (`domain.ts`, `sequence.ts`, `stats.ts`, `plants.ts`, `due.ts`): sin reloj
  ni I/O, fácil de testear y de portar a Supabase.
- **Reloj e ids inyectados** en los servicios (`now`, `newId`).
- **Regla de tracking conservadora** bien documentada en `focus-tracking/config.ts`: tope de
  30 s por heartbeat, timeout, idempotencia, cursor por segundos enteros.
- `handle()` centraliza errores y `connection()` (regla de `cacheComponents`).
- Interfaces de repositorio listas para la implementación de Supabase.
- `container.ts` resuelve la dependencia tareas ↔ foco sin imports cruzados.
- El service worker no toca la API (y hay un test que lo garantiza).
- Tests por capa, por rol/etiqueta accesible, con `fake-api.ts` que usa el servicio real.

---

## 6. Plan sugerido (commits chicos, `npm run verify` en cada uno)

| # | Cambio | Tipo | Riesgo |
| --- | --- | --- | --- |
| 1 | Borrar SVG de plantilla, `.gitkeep` redundantes, duplicados de `.gitignore`, Geist Mono, comentario de `next.config`, `${""}` | chore | nulo |
| 2 | Reescribir `README.md`; actualizar `NEXT-STEPS.md`, `docs/design/README.md` y el árbol de `SPEC.md` §4 | docs | nulo |
| 3 | Quitar código muerto (§3.2) **con sus tests**, en un commit explícito; decidir antes si `plantTotalSeconds` se queda | chore | bajo |
| 4 | Mover `FocusState`/`HeartbeatResponse` a `focus-tracking/types.ts`; `isOpenTask`, `formatClock`, `taskMeta` | refactor en verde | bajo |
| 5 | `lib/http/client.ts` + `features/*/api.ts`; `GardenView`/`TasksView` pasan a `useApi` | refactor en verde | medio (tocar tests de componentes que mockean `fetch`) |
| 6 | Partir `focus-panel.tsx` + `focus-view-model.ts` (test unitario nuevo **primero** para el view-model) | refactor + test | medio |
| 7 | `BottomSheet`, `Dialog`, `Stepper`, `Switch`; `SettingsForm` usa `styles.ts` | refactor | medio (cambio visual leve en Ajustes: borde 2 px → 1,5 px; confirmar con captura) |
| 8 | Separar `SettingsRepository` / `settings-service` / `stats-service`; mover `cycleAfter` a `sequence.ts` | refactor en verde | medio |
| 9 | `SettingsProvider` en el layout de la app (arregla pedidos repetidos y parpadeo del gate) | feature | medio — **empezar con un test rojo** que muestre que no se renderiza Foco antes de redirigir |
| 10 | Unificar paleta: `OfflineBanner`, `PWA.themeColor` y luego la landing/login al estilo 2b | diseño | bajo (el test `design-tokens`/`pwa-manifest` se actualiza a la vista) |

Los pasos 1–4 se pueden hacer en una tarde y ya dejan el repo bastante más limpio. Los
pasos 5–8 conviene hacerlos **antes de la Fase 2**, porque definen qué tablas y qué
repositorios hay que implementar en Supabase.
