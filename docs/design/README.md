# Handoff: Focus Garden — rediseño «Pastel juguetón» (2b)

## Overview
Rediseño de la app interior de Focus Garden (repo `Valenkra/Productividad`): un temporizador Pomodoro donde una planta crece de semilla a flor durante cada pomodoro, conectado a una lista de tareas. Pantallas: Onboarding (3 pasos), Foco, Descanso, Tareas, Añadir/editar tarea (hoja inferior), Selector de tarea (hoja inferior), Jardín, Estadísticas y Ajustes.

## About the Design Files
`Focus Garden Prototipo.dc.html` es una **referencia de diseño hecha en HTML**: muestra el aspecto y el comportamiento esperados, pero **no es código de producción**. La tarea consiste en **recrearlo dentro del código actual** (Next.js 16 App Router + Tailwind v4, organizado en `src/features/*`) siguiendo sus patrones: TDD estricto, rutas `/api` con `handle()`, crecimiento calculado en el servidor y nada de `Date.now()` en el render. Ábrelo en un navegador para probarlo (necesita `support.js` y `image-slot.js` en la misma carpeta).

## Fidelity
**Alta fidelidad** en layout, tipografía, radios, sombras, copy e interacciones. Para la **paleta**, la persona usuaria la encuentra «un poco chillona»: usa la columna **Suave** de la tabla de tokens (recomendada) en lugar de la columna **Prototipo**.

## Mapa al repo
| Diseño | Archivo en el repo |
| --- | --- |
| Tokens (colores, fuente) | `src/app/globals.css` (`:root` + `@theme inline`) |
| Foco + Descanso | `src/features/focus-tracking/focus-panel.tsx` |
| Etapas de la planta | `src/features/garden/growth.ts`, `plant-illustration.tsx` |
| Jardín | `src/features/garden/garden-view.tsx` |
| Tareas + hoja de edición | `src/features/tasks/tasks-view.tsx`, `schema.ts`, `types.ts` |
| Estadísticas | `src/features/history/stats-view.tsx`, `stats-view-model.ts`, `stats.ts` |
| Ajustes | `src/features/settings/settings-form.tsx`, `src/features/pomodoro/settings.ts` |
| Barra de pestañas | `src/components/layout/*` (barra flotante en móvil) |
| Onboarding | nuevo: `src/features/onboarding/` |

### Cambios de modelo/lógica (empezar cada uno con un test rojo)
1. **La planta crece dentro de cada pomodoro**, no por minutos acumulados. La etapa dentro de la sesión es `min(4, floor(elapsed / planned * 5))` mientras corre y pasa a `5` (Florecida) solo cuando la sesión termina como `completed`. Mantén `growth.ts` para el total histórico si lo sigues usando, y añade p. ej. `sessionStage(elapsedSec, plannedSec, completed)`.
2. **Jardín = una planta por cada sesión de foco completada** (tarea, materia, minutos, fecha). Las sesiones `abandoned` no generan planta.
3. **Task**: añadir `subject` (id de materia) y `estimatedPomodoros: number` (1–12, por defecto 2). `completedPomodoros` se deriva de las sesiones de foco completadas con `taskId`. El campo `dueAt` existente se muestra en chips (Hoy / Mañana / Esta semana / Sin fecha).
4. **Ajustes**: además de `PomodoroSettings`, añadir `autoStartBreak: boolean` (por defecto true) y `sound: boolean` (por defecto true).
5. **Onboarding**: flag `onboardingDone` por usuario y nombre visible (`displayName`).

## Screens / Views
Pantalla de referencia de 390×844 (iPhone). Barra de estado de 50 px. Barra de pestañas fija abajo: fondo blanco, `border-top 2px #f1d9c8`, padding `10px 12px 28px`, 4 columnas (Foco, Tareas, Jardín, Stats). Cada pestaña lleva un icono Lucide de 24 px (stroke 2.2) y una etiqueta de 12/600; la activa va en acento y el resto en `muted`.

Padding horizontal de pantalla: 20 px. Cabecera de cada pestaña: subtítulo 14/500 `muted` sobre título 30/600 (en Foco, 26/600).

### 1. Onboarding (3 pasos)
- Arriba: indicador de pasos (píldoras de 8 px; la activa de 26 px de ancho en acento, el resto en `line`) y «Saltar» a la derecha (15/500 `muted`).
- **Paso 1**: tarjeta de ilustración de 380 px de alto (radio 36, borde 2 px tinta, sombra `0 6px 0 tinta`, fondo menta). Título «Estudia y haz crecer tu planta» (34/600, line-height 1.1). Cuerpo: «Cada pomodoro empieza con una semilla. Si te concentras hasta el final, florece y se queda en tu jardín.» (17, `muted`).
- **Paso 2**: «Así funciona» y 3 tarjetas blancas (radio 24, borde 2, sombra `0 4px 0`), cada una con un cuadro numerado de 48 px (radio 16; fondos lila, melocotón y menta):
  1. «Elige una tarea» / «De tu lista de pendientes»
  2. «Concéntrate 25 minutos» / «La planta crece mientras estudias»
  3. «Descansa y colecciona» / «Cada flor va a tu jardín»

  Nota final: «Si abandonas un pomodoro a medias, esa planta no florece. Sin dramas: la siguiente semilla te espera.»
- **Paso 3**: «Último paso». Input de nombre (alto 58, radio 18, borde 2; foco con `box-shadow 0 0 0 4px #ffd3c4`). Ritmo: 3 opciones de 64 px de alto que fijan los tiempos de foco, descanso corto y descanso largo; la seleccionada va con fondo `#ffe0d4`:
  - Clásico 25/5 (largo 15)
  - Profundo 50/10 (largo 20)
  - Ligero 15/3 (largo 10)
- CTA inferior: «Siguiente» → «Empezar a estudiar» (botón primario «gordito», ver Componentes).

### 2. Foco
De arriba abajo:
- Cabecera: saludo (14/500 `muted`: «¡A por ello, {nombre}!» en reposo, «Concentración a tope» mientras corre) y título «Concentración». A la derecha, una píldora de ciclo «2/4» (blanca, borde 2, sombra `0 3px 0`) y un botón de engranaje de 44 px que abre Ajustes.
- Tarjeta de la planta: 286 px de alto, radio 36, borde 2 tinta, sombra `0 6px 0 tinta`, fondo menta. Arriba a la izquierda, una píldora blanca con el nombre de la etapa. Las ilustraciones de cada etapa se funden entre sí (opacity .5 s).
- Camino de etapas (6 nodos unidos por líneas de 4 px), con 18 px de margen superior:
  - Completada: punto de 22 px en acento con borde 2 tinta.
  - Actual: 30 px, fondo blanco, borde 3 acento y punto interior de 12 px.
  - Pendiente: 22 px en `line`.
  - Líneas: en acento hasta la etapa actual; el resto en `line`.
- Tiempo: «18:42» en 92/600, tabular-nums, centrado.
- Pista bajo el tiempo (15, `muted`):
  - «Pulsa empezar para plantar tu semilla» (en reposo)
  - «{siguiente etapa} en mm:ss» (corriendo)
  - «En pausa — tu planta te espera» (en pausa)
  - «Florece al terminar» (última etapa antes de florecer)
- Tarjeta de tarea: fondo lila, radio 20, padding `10px 14px`. Lleva un punto de 14 px con el color de la materia, el título (16/500, una línea con elipsis), el meta «Materia · 2 de 4 pomodoros» (13 `muted`) y «cambiar» a la derecha. Al tocarla se abre el Selector.
- Botones: primario flexible (Empezar / Pausar / Seguir) y, a la derecha, un botón secundario de 72 × 62 con icono `skip-forward`. Este último solo aparece si el pomodoro ya empezó: en foco abre el diálogo de rendirse.

### 3. Descanso (estado de Foco)
- Cambia el fondo de pantalla a `#f1ebff` y el de la tarjeta de planta a `#e3d8ff`, con una transición de .4 s.
- La planta se muestra en la etapa 5 (Florecida).
- Título «Descanso corto» o «Descanso largo». Saludo «¡Floreció! Bien hecho».
- El camino de etapas se sustituye por un consejo en una tarjeta blanca de radio 18:
  - Corto: «Levántate, estira la espalda y bebe agua.»
  - Largo: «Descanso largo: sal a caminar o come algo rico.»
- Sin tarjeta de tarea. El botón skip = «Saltar descanso».

### 4. Tareas
- Cabecera con el subtítulo «{n} para hoy · {m} pendientes».
- Tarjeta de cada tarea: blanca, radio 22, borde 2, sombra `0 4px 0`, padding 12. Contiene:
  - Casilla de 30 px (radio 10, borde 2; hover en menta).
  - Título (16/500).
  - Fila meta: chip de materia (radio 999, 12/600, fondo del color de la materia), punto de prioridad de 8 px + fecha (12 `muted`) y puntos de pomodoro de 10 px (borde 2 acento; rellenos = hechos).
  - Botón play redondo de 44 px en acento: selecciona la tarea y lleva a Foco.
- Al tocar el cuerpo de la tarjeta se abre Editar.
- Sección «Hechas»: tarjetas sin borde con fondo `#fbe9db`, casilla verde con check, título tachado en `#8a7598` y «2/2» a la derecha.
- Vacío: tarjeta menta con «¡Todo hecho! Añade algo nuevo o date un respiro.»
- Botón flotante: 64 px, radio 22, en acento, a 20 px de la derecha y 104 px del fondo, con icono `plus`.

### 5. Añadir / editar tarea (hoja inferior)
- Overlay `rgba(59,42,74,.45)`. Hoja con fondo base, radio superior 32 y padding `14px 20px 34px`, gap 16.
- Título «Nueva tarea» / «Editar tarea» (24/600) y botón de cerrar de 40 px.
- Input de título (placeholder «¿Qué tienes que estudiar?»). Si está vacío al guardar: borde `#c2492c` y el texto «Ponle un nombre a la tarea» (13/500).
- Materia: chips de 38 px. Seleccionado: fondo del color de la materia y borde tinta. No seleccionado: blanco con borde `#ead6c8`.
- Prioridad: control segmentado de 3 opciones (contenedor `#fbe3d4`, padding 4, radio 16). La opción activa va en blanco con borde 2 tinta; cada una lleva un punto de color.
- Pomodoros: contador − n + (1–12) y, al lado, el total «{n × foco} min».
- Para cuándo: chips Hoy / Mañana / Esta semana / Sin fecha (el seleccionado en lila).
- Acciones: eliminar (botón de 62 px con icono `trash`, solo al editar) y «Guardar» (primario).

### 6. Selector de tarea (hoja inferior)
- Título «¿En qué vas a trabajar?».
- Lista de pendientes en filas con borde 2 y radio 20; la seleccionada va con fondo `#ffe0d4`.
- «Sesión libre, sin tarea» (borde discontinuo `#c9b8d6`).
- «+ Nueva tarea» (fondo lila). Abre la hoja de edición, y al guardar la tarea nueva queda seleccionada.
- Tocar fuera cierra la hoja.

### 7. Jardín
- Subtítulo «{n} plantas florecidas».
- Grupos por día (Hoy, Ayer, Miércoles…), con la etiqueta 15/600 y el total de minutos a la derecha.
- Rejilla de 3 columnas con gap 10. Cada planta es un cuadrado de radio 22 con borde 2 y el color de su materia, el icono `flower-2` de 40 px y el título debajo (12, máximo 2 líneas). Sustituye el icono por la ilustración de la etapa 5 si quieres.

### 8. Estadísticas
- 3 tarjetas (radio 22, sin borde): «min hoy» (melocotón), «pomodoros» (menta) y «días de racha» (lila). Número en 28/600.
- «Minutos por día»: tarjeta blanca con borde 2 y sombra `0 4px 0`, gráfico de barras de 7 días (L–D) y 170 px de alto. Barras de radio 10; hoy en acento, días pasados en `#ffc4b0`, días futuros en `#f6ece4`. Valor encima de cada barra (12 `muted`).
- «Por materia»: barras horizontales de 12 px de alto (pista `#f6ece4`, relleno del color de la materia con borde 2), ordenadas por minutos.

### 9. Ajustes
- Botón de volver (44 px) y título.
- Grupo «Tiempos»: tarjeta con filas separadas por `2px #f6ece4`, cada una con su contador −/+ de 36 px (radio 12):
  - Concentración: paso 5, de 5 a 180
  - Descanso corto: paso 1, de 1 a 60
  - Descanso largo: paso 5, de 5 a 120
  - Ciclo: paso 1, de 2 a 12
- Grupo «Preferencias»: interruptores de 54 × 32 (encendido en verde `#7fcf9f`, apagado en `line`; perilla blanca de 24 px con borde 2) para «Empezar descanso automáticamente» y «Sonido al terminar».
- «Ver la introducción otra vez» (botón con borde discontinuo).

## Interactions & Behavior
- **Máquina de estados del temporizador**: `mode ∈ {focus, short_break, long_break}` + `running`.
  - Empezar / Seguir pone `running = true`; Pausar pone `running = false`.
  - Al terminar el foco: se crea la planta en el jardín, se suma 1 a los pomodoros de la tarea y se incrementa `completedInCycle`. Si `completedInCycle >= longBreakInterval`, el siguiente modo es descanso largo; si no, descanso corto (igual que `nextMode()` en `sequence.ts`). El descanso arranca solo si `autoStartBreak`.
  - Al terminar el descanso: vuelve al foco en reposo; si el descanso era largo, `completedInCycle = 0`.
- **Rendirse** (skip en foco): pausa el temporizador y abre un diálogo centrado (blanco, radio 30, borde 2, sombra `0 6px 0`) con:
  - Título: «¿Rendirte ahora?»
  - Texto: «Tu {etapa} no llegará a florecer y no irá al jardín. Lo que estudiaste sigue contando para ti.»
  - Botones: «Seguir estudiando» (primario; reanuda) y «Sí, terminar» (texto; reinicia el foco y cierra la sesión como `abandoned`).
- Cambiar los tiempos en Ajustes solo reinicia el contador si la fase está en reposo (sin empezar).
- **Pulsación «gordita»**: `:active` → `translateY(4px)` y la sombra baja de `0 5px 0` a `0 1px 0`. Hover del primario: `#ff8a6c`.
- Las transiciones de color usan .3–.4 s ease; respeta `prefers-reduced-motion`, que ya está en `globals.css`.
- Mantén la regla del repo: el tiempo solo cuenta con la app visible y en primer plano.

## Design Tokens
Fuente: **Fredoka** 400/500/600/700 (`next/font/google`) para todo. Sustituye Fraunces y Geist en la app interior.

| Rol | Prototipo | Suave (recomendado) |
| --- | --- | --- |
| Fondo base | `#fff3e8` | `#fbf5ee` |
| Tinta (texto, bordes, sombras) | `#3b2a4a` | `#4a3d55` |
| Muted (texto secundario) | `#6d5a80` | `#776a84` |
| Acento (primario, progreso) | `#ff7a59` | `#e8846a` |
| Acento hover | `#ff8a6c` | `#ee9781` |
| Menta (tarjeta planta, éxito) | `#c9ecd6` | `#d6ebdd` |
| Lila (tarea seleccionada, descanso) | `#e9e0ff` | `#ebe5f7` |
| Fondo descanso | `#f1ebff` | `#f3f0f8` |
| Melocotón (seleccionado) | `#ffe0d4` | `#f7e3da` |
| Line / pista | `#f1d9c8` | `#eddfd3` |
| Error | `#c2492c` | `#b5523b` |
| Materias | Cálculo `#ffb59e` · Química `#bfe8cf` · Historia `#ddd2ff` · Inglés `#ffe3a3` | `#f2c2b2` · `#cfe6d7` · `#e0d9f5` · `#f3e3b8` |
| Prioridad | alta `#ff7a59` · media `#ffc24d` · baja `#7fcf9f` | `#e8846a` · `#e9c16e` · `#94c9a8` |

Para que la paleta suave sea aún más tranquila, usa sombras sólidas de 4 px en lugar de 5–6 px y bordes de 1.5 px.

- **Radios**: píldora 999 · tarjeta de planta e ilustración 36 · hojas inferiores 32 (solo arriba) · diálogo 30 · tarjetas 22–26 · botones grandes 20–22 · chips de ajustes 12–16 · casilla 10.
- **Bordes**: 2 px tinta en todo elemento «físico» (tarjetas, botones, chips seleccionados).
- **Sombras**: sólidas y sin desenfoque, en color tinta: `0 3px 0` (píldoras, botones de 44 px), `0 4px 0` (tarjetas), `0 5px 0` (botones primarios), `0 6px 0` (tarjeta de planta, diálogo).
- **Espaciado**: padding de pantalla 20; gaps 6 / 8 / 10 / 12 / 14 / 16 / 20.
- **Tipografía**:

  | Uso | Tamaño/peso |
  | --- | --- |
  | Temporizador | 92/600 |
  | Título onboarding | 34/600 |
  | Título de pestaña | 30/600 |
  | Título de hoja | 24/600 |
  | Cuerpo grande | 17 |
  | Cuerpo | 16/500 |
  | Etiqueta | 14–15/600 |
  | Meta | 12–13 |

- Alturas táctiles: botones primarios de 60–62 px; ningún objetivo táctil por debajo de 44 px.

## Assets
- **Ilustraciones de la planta**: una por etapa (0 Semilla … 5 Florecida). En el prototipo son huecos vacíos donde se arrastra una imagen. En el repo puedes reutilizar `PlantIllustration` (SVG) recoloreándola con los tokens nuevos, o cambiarla por imágenes (`/public/plants/stage-0.png` … `stage-5.png`, fondo transparente, anclado a la maceta como el modo `fit` actual).
- **Ilustración de bienvenida** para el paso 1 del onboarding.
- **Iconos**: Lucide (`lucide-react`): `timer`, `list-checks`, `sprout`, `bar-chart-3`, `settings`, `skip-forward`, `play`, `plus`, `check`, `x`, `trash`, `chevron-left`, `flower-2`.

## Files
- `Focus Garden Prototipo.dc.html` — el prototipo interactivo, referencia principal. Desde Tweaks se ajusta la velocidad de la demo (x60 por defecto) y se muestra u oculta el onboarding.
- `Focus Garden - Direcciones.dc.html` — exploración de direcciones; la elegida es la 2b.
- `support.js`, `image-slot.js` — runtime necesario para abrir los HTML en el navegador.

## Cómo usarlo con Claude Code
1. Copia esta carpeta en el repo, por ejemplo en `docs/design/focus-garden-2b/`.
2. En Claude Code, dentro del repo: *«Lee `docs/design/focus-garden-2b/README.md` y abre el prototipo como referencia. Implementa el rediseño siguiendo CLAUDE.md (TDD estricto, `npm run verify` al cerrar cada tarea). Empieza por los tokens en `globals.css` con la paleta Suave y Fredoka; después Foco/Descanso, Tareas + hoja de edición, Jardín, Stats, Ajustes y Onboarding. Verifica con capturas Playwright a 390×844.»*
3. Pide un commit por pantalla para revisar los cambios por partes.
