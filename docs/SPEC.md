# README --- App de productividad con Pomodoro y crecimiento de plantas

## 1. Objetivo del proyecto

Construir una aplicación web **responsive, mobile-first e instalable
como PWA** para organizar tareas, estudiar con sesiones Pomodoro y
convertir el tiempo de concentración real en crecimiento de una planta
virtual.

La experiencia principal debe ser simple y motivadora:

1.  La persona crea y organiza sus tareas.
2.  Inicia una sesión de concentración o Pomodoro.
3.  Mientras la aplicación permanece abierta, visible y en primer plano,
    acumula tiempo válido de estudio.
4.  Cada minuto válido hace crecer su planta.
5.  Puede volver a la aplicación para ver su progreso, el historial y
    las plantas que fue cultivando.

Aunque inicialmente la va a usar una sola persona, la arquitectura debe
soportar múltiples usuarios sin tener que rehacer el sistema.

**Restricción económica:** el proyecto debe poder desarrollarse,
desplegarse y utilizarse con planes gratuitos. No incorporar servicios
pagos ni dependencias que requieran una suscripción. Si una
funcionalidad no puede ofrecerse realmente gratis, documentarlo y
proponer una alternativa.

------------------------------------------------------------------------

## 2. Decisiones de producto y límites técnicos

### 2.1 Qué significa «tiempo de estudio válido»

No se debe sumar tiempo simplemente porque exista una sesión iniciada.
Un segundo cuenta únicamente cuando se cumplen estas condiciones:

-   Hay una sesión de concentración activa.
-   La pestaña/documento está visible
    (`document.visibilityState === "visible"`).
-   La ventana/documento tiene foco (`document.hasFocus()`), en la
    medida en que el navegador lo permita.
-   La sesión no está pausada ni finalizada.
-   El cliente envía señales periódicas de actividad y el servidor
    valida los intervalos.

Si la persona cambia de pestaña, minimiza el navegador, cambia a otra
aplicación o bloquea el celular, la aplicación debe pausar o dejar de
acreditar tiempo. Al volver, debe mostrar claramente que la sesión se
pausó y permitir reanudarla.

**Limitación importante:** una PWA/web no puede garantizar que la
persona esté estudiando cognitivamente ni detectar de forma universal
todo uso de otras aplicaciones. Los navegadores móviles, especialmente
iOS, también limitan la ejecución en segundo plano y pueden suspender
pestañas. Por eso, el producto debe describirlo como «tiempo con la app
activa y visible», no como una medición infalible de atención. No
intentar eludir las restricciones del sistema operativo.

### 2.2 Regla de crecimiento

-   Acumular segundos válidos, no redondear cada heartbeat.
-   Por cada 60 segundos válidos acumulados, sumar una unidad de
    crecimiento.
-   El progreso parcial (por ejemplo, 43/60 segundos) debe conservarse.
-   El crecimiento debe derivarse del tiempo válido confirmado, no de la
    hora del reloj del dispositivo.
-   No duplicar minutos al reintentar una petición o recuperar conexión.
-   Definir una política clara ante desconexiones: no acreditar
    intervalos que no puedan verificarse. Mostrar al usuario que el
    tiempo no pudo confirmarse.
-   Guardar el progreso en la base de datos para que no se pierda al
    cerrar sesión o cambiar de dispositivo.

### 2.3 Pomodoro

Configurar inicialmente: - Concentración: 25 minutos. - Descanso corto:
5 minutos. - Descanso largo: 15 minutos. - Descanso largo después de 4
bloques de concentración.

Permitir modificar estos valores en Ajustes. El crecimiento de la planta
solo ocurre durante bloques de concentración, nunca durante descansos.
Agregar controles para iniciar, pausar, reanudar, terminar y saltar una
fase, con confirmación cuando corresponda.

El temporizador visual no debe ser la fuente de verdad del tiempo
acumulado. Debe reconciliarse con el estado de sesión validado por el
servidor.

------------------------------------------------------------------------

## 3. Arquitectura recomendada

### 3.1 Stack

  -----------------------------------------------------------------------
  Capa                    Tecnología              Motivo
  ----------------------- ----------------------- -----------------------
  Frontend                Next.js + TypeScript    Aplicación moderna,
                                                  tipado y posibilidad de
                                                  crecer

  UI                      Tailwind CSS +          Responsive y
                          componentes accesibles  consistencia visual

  Aplicación móvil        PWA (manifest + service Instalable desde el
                          worker)                 navegador, sin publicar
                                                  en stores

  Backend                 Next.js Route Handlers  Evita mantener un
                          / Server Actions        servidor separado al
                                                  inicio

  Base de datos           Supabase PostgreSQL     SQL relacional,
                                                  backups/exportación y
                                                  RLS

  Autenticación           Supabase Auth           Google OAuth y
                                                  autenticación
                                                  extensible

  Validación              Zod                     Validar entradas en
                                                  cliente y servidor

  Estado remoto           TanStack Query o        Caché, sincronización y
                          solución nativa de      estados de carga
                          Next.js                 

  Formularios             React Hook Form + Zod   Formularios mantenibles

  Tests                   Vitest + Testing        Unitarios, componentes
                          Library + Playwright    y flujos end-to-end

  Hosting                 Vercel Hobby o          Despliegue sencillo de
                          alternativa gratuita    Next.js
                          compatible              

  Código                  Git + GitHub            Versionado y CI
  -----------------------------------------------------------------------

No agregar Redis, colas, microservicios ni infraestructura adicional
para el MVP. No hacen falta para el volumen inicial. Mantener límites
claros entre módulos para poder extraer servicios más adelante si el
crecimiento lo justifica.

### 3.2 Servicios y costos

Objetivo: costo mensual de infraestructura de **USD 0** dentro de los
límites de los planes gratuitos vigentes.

-   Supabase Free: base de datos y autenticación.
-   Vercel Hobby: hosting del frontend y endpoints, sujeto a sus
    condiciones y límites.
-   Google OAuth: configuración de un proyecto OAuth sin costo de uso
    habitual.
-   GitHub: repositorio privado o público gratuito.
-   Dominio: usar inicialmente el subdominio gratuito del hosting.

Los planes gratuitos tienen límites, políticas de inactividad y
condiciones que pueden cambiar. Antes del despliegue, Claude debe
verificar la documentación y condiciones actuales. No activar pruebas
pagas, servicios premium ni introducir una tarjeta como requisito.

**Google:** implementar Google OAuth mediante Supabase Auth.

**Apple:** dejar preparada una abstracción de proveedores para agregar
Sign in with Apple, pero no prometer que es gratis. La configuración web
de Sign in with Apple suele requerir membresía del Apple Developer
Program, que es paga. Para cumplir el requisito de costo cero, el MVP
debe salir con Google y, opcionalmente, email mediante Supabase Auth. No
bloquear el desarrollo por Apple.

### 3.3 Diagrama lógico

``` text
┌──────────────────────────────────────────────┐
│             Usuario / celular                 │
│        PWA responsive (Next.js)               │
│  Tasks · Pomodoro · Planta · Historial        │
└──────────────────────┬───────────────────────┘
                       │ HTTPS
                       ▼
┌──────────────────────────────────────────────┐
│              Next.js Backend                  │
│ Route Handlers · validación · reglas negocio │
│ Sesiones · heartbeats · progreso · tareas    │
└──────────────────────┬───────────────────────┘
                       │ Supabase SDK seguro
                       ▼
┌──────────────────────────────────────────────┐
│                 Supabase                      │
│ Auth (Google/email) · PostgreSQL · RLS        │
│ Usuarios · tareas · sesiones · plantas       │
└──────────────────────────────────────────────┘
```

El cliente nunca debe tener acceso a la `service_role key`. Las
operaciones sensibles deben ejecutarse en el servidor o mediante
políticas RLS estrictas. La clave pública/anon puede estar en el
cliente, protegida por RLS.

------------------------------------------------------------------------

## 4. Estructura del repositorio

> **Nota (2026-11-20):** este árbol es el plan inicial. La estructura real está en el
> `README.md`. Diferencias: en Next 16 es `proxy.ts` (no `middleware.ts`); el heartbeat vive en
> `api/focus-sessions/[id]/heartbeat`; hay además `features/{onboarding,landing,pwa}`,
> `lib/http` y los servicios `settings`, `stats` y `garden` en `server/services`.

Organizar el código por dominios funcionales, no por páginas aisladas.

``` text
focus-garden/
├── public/
│   ├── icons/
│   ├── plants/
│   ├── manifest.webmanifest
│   └── ...
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── auth/callback/
│   │   ├── (app)/
│   │   │   ├── dashboard/
│   │   │   ├── tasks/
│   │   │   ├── focus/
│   │   │   ├── garden/
│   │   │   ├── history/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   ├── focus-sessions/
│   │   │   ├── heartbeat/
│   │   │   └── ...
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── feedback/
│   ├── features/
│   │   ├── auth/
│   │   ├── tasks/
│   │   ├── pomodoro/
│   │   ├── focus-tracking/
│   │   ├── garden/
│   │   ├── history/
│   │   └── settings/
│   ├── lib/
│   │   ├── supabase/
│   │   ├── validation/
│   │   ├── time/
│   │   └── utils/
│   ├── server/
│   │   ├── services/
│   │   └── repositories/
│   ├── types/
│   └── middleware.ts
├── supabase/
│   ├── migrations/
│   └── seed.sql
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── README.md
└── ...
```

Claude puede ajustar esta estructura si encuentra una razón técnica
concreta, pero debe mantener separación entre UI, lógica de negocio,
acceso a datos y validación.

------------------------------------------------------------------------

## 5. Modelo de datos

Diseñar el esquema con UUID, timestamps en UTC y `user_id` en todas las
entidades privadas. Incluir índices y claves foráneas.

### `profiles`

-   `id`: UUID, PK y FK a `auth.users.id`.
-   `display_name`: texto nullable.
-   `avatar_url`: texto nullable.
-   `timezone`: texto, por defecto inferido al registrarse.
-   `created_at`, `updated_at`.

### `tasks`

-   `id`: UUID.
-   `user_id`: UUID, FK a profiles.
-   `title`: texto obligatorio.
-   `description`: texto nullable.
-   `status`: `todo | in_progress | done | archived`.
-   `priority`: `low | medium | high`.
-   `due_at`: timestamp nullable.
-   `completed_at`: timestamp nullable.
-   `position`: entero para orden.
-   `created_at`, `updated_at`.

### `focus_sessions`

-   `id`: UUID.
-   `user_id`: UUID.
-   `task_id`: UUID nullable.
-   `mode`: `focus | short_break | long_break`.
-   `status`: `active | paused | completed | abandoned`.
-   `planned_duration_seconds`: entero.
-   `credited_seconds`: entero, inicialmente 0.
-   `started_at`, `paused_at`, `ended_at`: timestamps nullable.
-   `created_at`, `updated_at`.

### `focus_intervals`

Registro auditable de los intervalos efectivamente acreditados: - `id`:
UUID. - `session_id`: UUID. - `user_id`: UUID. - `started_at`,
`ended_at`: timestamps. - `credited_seconds`: entero. -
`idempotency_key`: texto único por usuario/sesión para evitar
duplicados. - `created_at`.

### `plants`

-   `id`: UUID.
-   `user_id`: UUID.
-   `name`: texto.
-   `plant_type`: identificador de especie/estilo.
-   `total_focus_seconds`: bigint, default 0.
-   `growth_stage`: entero calculado o actualizado por lógica de
    dominio.
-   `is_active`: boolean.
-   `created_at`, `updated_at`.

### `pomodoro_settings`

-   `user_id`: UUID, PK.
-   `focus_minutes`: entero, default 25.
-   `short_break_minutes`: entero, default 5.
-   `long_break_minutes`: entero, default 15.
-   `long_break_interval`: entero, default 4.
-   `auto_start_breaks`: boolean.
-   `auto_start_focus`: boolean.
-   `updated_at`.

### Consideraciones de datos

-   Crear migraciones SQL versionadas; no depender de cambios manuales
    en el dashboard.
-   Establecer `ON DELETE` conscientemente.
-   Crear índices para `user_id`, fechas, estado y relaciones
    consultadas.
-   Usar restricciones `CHECK` para estados, prioridades y duraciones.
-   Crear una función o servicio transaccional para acreditar intervalos
    y actualizar el total de la planta de forma atómica.
-   Evitar almacenar datos derivados si pueden calcularse con seguridad;
    si se cachean, documentar cómo se mantienen consistentes.

------------------------------------------------------------------------

## 6. Seguridad y aislamiento entre usuarios

Configurar Row Level Security (RLS) en todas las tablas privadas.

Política base: cada usuario solo puede leer, insertar, actualizar y
borrar filas cuyo `user_id = auth.uid()`. En `profiles`, permitir acceso
solo al perfil propio. Validar también en backend; no confiar únicamente
en la UI.

Requisitos: - No exponer secretos en el repositorio. - Crear
`.env.example` con nombres de variables, nunca valores reales. - Ignorar
`.env.local` y archivos sensibles en Git. - Verificar autorización en
cada endpoint. - Validar que una tarea asociada a una sesión pertenezca
al mismo usuario. - Limitar frecuencia/tamaño de heartbeats y validar
transiciones de estado. - No aceptar del cliente una cantidad arbitraria
de segundos para acreditar. - Usar timestamps del servidor y una
política conservadora ante desconexiones. - Documentar rotación de
claves y configuración de OAuth.

------------------------------------------------------------------------

## 7. Lógica de tracking: la parte más importante

Implementar el tracking como un módulo independiente y testeable.

### 7.1 Flujo esperado

1.  El usuario inicia una sesión de foco.
2.  El servidor crea la sesión con estado `active` y registra el inicio.
3.  El cliente inicia un reloj visual y un mecanismo de heartbeat
    periódico (por ejemplo, cada 10--15 segundos mientras la página está
    visible y enfocada).
4.  Cada heartbeat incluye el ID de sesión, una clave de idempotencia y
    la información mínima necesaria.
5.  El servidor valida usuario, estado, secuencia, frecuencia y tiempo
    transcurrido desde el último intervalo aceptado.
6.  El servidor acredita únicamente el intervalo verificable y lo
    registra en `focus_intervals`.
7.  Se actualizan `credited_seconds` y `plants.total_focus_seconds` en
    una operación atómica.
8.  Cuando la pestaña pierde visibilidad/foco, el cliente envía una
    solicitud de pausa si puede hacerlo; independientemente de ello, el
    servidor debe aplicar un timeout conservador para no seguir sumando.
9.  Al volver, el usuario ve la sesión pausada y puede reanudarla.

### 7.2 Protección contra errores y manipulación accidental

-   Las peticiones deben ser idempotentes.
-   No acreditar dos veces un mismo intervalo.
-   No permitir que el cliente envíe `credited_seconds` como valor
    libre.
-   No acreditar tiempo entre heartbeats por encima de un máximo
    razonable.
-   Si un heartbeat llega tarde, no acreditar automáticamente todo el
    tiempo ausente.
-   Definir el intervalo máximo acreditable y justificarlo. Priorizar no
    sumar tiempo falso.
-   Manejar doble pestaña/dispositivo: una sola sesión activa por
    usuario, salvo que se diseñe explícitamente otra política.
-   Manejar pérdida de red sin inventar tiempo.
-   Al recargar, consultar el estado real de la sesión antes de mostrar
    el temporizador.
-   Probar cambios de hora del dispositivo; el servidor debe ser la
    referencia.

### 7.3 Eventos del navegador

Usar: - `visibilitychange` - `focus` / `blur` - `pagehide` / `pageshow`
como señales adicionales - `document.visibilityState` -
`document.hasFocus()`

No depender únicamente de `beforeunload` o `unload`, porque no son
fiables en móviles. El service worker no debe acreditar tiempo: puede
ejecutarse en segundo plano y no demuestra que la app esté visible.

------------------------------------------------------------------------

## 8. Funcionalidades y pantallas

### 8.1 Login y onboarding

-   Login con Google OAuth.
-   Opción de email si se implementa sin costo adicional.
-   Preparar una interfaz de proveedores extensible para Apple en una
    etapa futura.
-   Callback OAuth seguro.
-   Crear perfil automáticamente al registrarse.
-   Onboarding breve: nombre, configuración Pomodoro y primera planta.
-   Cerrar sesión.

### 8.2 Dashboard

Pantalla inicial con: - Planta activa y animación/ilustración según
etapa. - Tiempo de foco de hoy. - Progreso hacia una meta diaria
configurable. - Botón principal «Empezar a estudiar». - Próxima tarea o
tareas pendientes. - Resumen de sesiones del día.

### 8.3 Tareas

-   Crear, editar, eliminar y archivar tareas.
-   Marcar como completadas.
-   Prioridad y fecha límite opcionales.
-   Ordenar y filtrar por estado/prioridad.
-   Asociar una sesión Pomodoro a una tarea.
-   Evitar que la gestión de tareas sea más compleja que la función
    principal.

### 8.4 Pantalla de foco

Debe ser la pantalla más cuidada: - Temporizador grande y legible. -
Estado: concentración, descanso corto o largo. - Planta visible y con
feedback de crecimiento. - Tarea asociada. - Iniciar, pausar, reanudar,
finalizar y saltar. - Indicador claro de si el tiempo está contando. -
Aviso cuando la app pierde foco o visibilidad. - Al finalizar un bloque,
mostrar tiempo acreditado y crecimiento conseguido.

### 8.5 Jardín

-   Vista de la planta actual.
-   Etapas visuales de crecimiento.
-   Historial de plantas cultivadas o posibilidad de desbloquear nuevas
    especies en el futuro.
-   Mostrar segundos/minutos de foco acumulados.
-   La primera versión puede tener una sola especie con varias etapas;
    priorizar calidad antes que cantidad.

### 8.6 Historial y estadísticas

-   Sesiones por día/semana.
-   Tiempo válido total.
-   Minutos por tarea.
-   Racha opcional, sin castigar al usuario por descansar.
-   Gráfico simple de foco diario/semanal.
-   Diferenciar tiempo planificado de tiempo acreditado.

### 8.7 Ajustes

-   Duraciones Pomodoro.
-   Meta diaria.
-   Preferencias de notificaciones/sonido.
-   Zona horaria.
-   Cuenta y cierre de sesión.

------------------------------------------------------------------------

## 9. Diseño y experiencia de usuario

Crear una estética tranquila, cálida y minimalista, inspirada en un
pequeño jardín de concentración. Evitar que parezca un panel
corporativo.

Lineamientos: - Mobile-first: diseñar primero para 360--430 px de
ancho. - Debe funcionar bien en desktop y tablet. - Navegación inferior
en móvil; sidebar o navegación adaptada en desktop. - Áreas táctiles de
al menos 44 px. - Tipografía legible, contraste accesible y estados
claros. - Animaciones suaves y breves; respetar
`prefers-reduced-motion`. - Evitar animaciones pesadas que consuman
batería. - No depender solo del color para indicar estado. - Mantener la
acción de iniciar foco siempre accesible. - Diseñar estados vacíos,
carga, error, offline y sesión pausada. - La planta debe sentirse como
el elemento central y emocional del producto.

Proponer un sistema visual consistente: paleta natural (verdes, crema,
tierra), superficies claras y acentos discretos. Claude puede definir
los valores exactos y documentarlos.

------------------------------------------------------------------------

## 10. PWA y experiencia móvil

-   Incluir `manifest.webmanifest`, iconos y nombre de la aplicación.
-   Configurar service worker con una estrategia segura.
-   Permitir instalar la app desde el navegador cuando sea compatible.
-   Cachear únicamente assets estáticos y recursos que no comprometan
    datos privados.
-   No cachear indiscriminadamente respuestas autenticadas.
-   Mostrar instrucciones de instalación para iOS y Android.
-   Aclarar que en iOS la PWA debe permanecer abierta en primer plano
    para acreditar tiempo.
-   No prometer tracking con pantalla bloqueada ni en segundo plano.
-   Si se pierde conexión, mostrar el estado offline y no acreditar
    intervalos no confirmados.

------------------------------------------------------------------------

## 11. API / operaciones de dominio

Diseñar endpoints o acciones equivalentes, con validación y
autorización.

  ------------------------------------------------------------------------------
  Operación                                  Responsabilidad
  ------------------------------------------ -----------------------------------
  `POST /api/focus-sessions`                 Crear/iniciar sesión

  `GET /api/focus-sessions/active`           Recuperar sesión activa

  `POST /api/focus-sessions/:id/heartbeat`   Solicitar acreditación de intervalo

  `POST /api/focus-sessions/:id/pause`       Pausar sesión

  `POST /api/focus-sessions/:id/resume`      Reanudar sesión

  `POST /api/focus-sessions/:id/complete`    Completar sesión

  `GET/POST /api/tasks`                      Listar y crear tareas

  `PATCH/DELETE /api/tasks/:id`              Actualizar/eliminar tarea

  `GET /api/garden`                          Obtener planta y progreso

  `GET/PATCH /api/settings`                  Consultar/actualizar ajustes

  `GET /api/stats`                           Obtener estadísticas
  ------------------------------------------------------------------------------

Los nombres pueden adaptarse al estilo de Next.js. No crear endpoints
innecesarios si Server Actions son más adecuadas; mantener las mismas
reglas de validación y seguridad.

------------------------------------------------------------------------

## 12. Plan de implementación

Construir por etapas. No generar todo de una vez sin verificar que cada
capa funcione.

### Fase 0 --- Inspección y plan

-   Revisar el repositorio y su estado.
-   Presentar arquitectura y decisiones.
-   Identificar riesgos técnicos, especialmente tracking móvil.
-   Crear checklist de implementación.
-   No sobrescribir archivos existentes sin inspeccionarlos.

### Fase 1 --- Base del proyecto

-   Crear Next.js + TypeScript.
-   Configurar Tailwind y componentes.
-   Configurar lint, formato y tests.
-   Crear `.env.example`.
-   Crear layout responsive y navegación.
-   Confirmar que corre localmente.

### Fase 2 --- Supabase y autenticación

-   Crear cliente browser y server correctamente.
-   Configurar middleware/protección de rutas según la versión actual de
    Next.js y Supabase SSR.
-   Crear migraciones y RLS.
-   Implementar Google OAuth.
-   Crear perfil y onboarding.
-   Documentar paso a paso la configuración de Supabase y Google Cloud.

### Fase 3 --- Tareas

-   CRUD completo.
-   Filtros, prioridades y fechas.
-   Asociar tareas a sesiones.
-   Tests de permisos y validaciones.

### Fase 4 --- Pomodoro y tracking

-   Máquina de estados de sesiones.
-   Timer visual.
-   Heartbeat y validación del servidor.
-   Pausa al perder visibilidad/foco.
-   Idempotencia y límites de acreditación.
-   Persistencia y recuperación tras recarga.
-   Tests de cambios de pestaña, suspensión, red y reloj.

### Fase 5 --- Planta

-   Modelo de crecimiento.
-   Conversión de segundos válidos a progreso.
-   Etapas visuales.
-   Animaciones.
-   Persistencia y pruebas de no duplicación.

### Fase 6 --- Dashboard, jardín e historial

-   Estadísticas.
-   Historial de sesiones.
-   Metas.
-   Estados vacíos y feedback.

### Fase 7 --- PWA, accesibilidad y responsive

-   Manifest, iconos y service worker.
-   Instalable en móvil.
-   Pruebas reales en Android/iOS si están disponibles.
-   Revisar accesibilidad, rendimiento y batería.

### Fase 8 --- Deploy y documentación

-   Deploy en plan gratuito.
-   Variables de entorno.
-   URLs de OAuth.
-   Migraciones de producción.
-   README de instalación, desarrollo, deploy y troubleshooting.
-   Checklist de seguridad y costos.

Al final de cada fase, ejecutar los tests relevantes y resumir archivos
creados/modificados, comandos ejecutados, resultados y pendientes. No
avanzar si hay errores bloqueantes.

------------------------------------------------------------------------

## 13. Criterios de aceptación

El proyecto se considera funcional cuando:

1.  Se puede crear una cuenta e iniciar sesión con Google.
2.  Un usuario no puede consultar ni modificar datos de otro.
3.  Se pueden crear, editar, completar y eliminar tareas.
4.  Se puede iniciar un Pomodoro y asociarlo a una tarea.
5.  El timer permite pausar, reanudar y completar.
6.  El tiempo solo se acredita mientras la app está visible, enfocada y
    la sesión está activa, sujeto a las limitaciones del navegador.
7.  Al cambiar de aplicación o pestaña, el tracking se detiene o queda
    pausado de forma conservadora.
8.  Cada 60 segundos válidos se actualiza el progreso de la planta.
9.  Recargar la página no duplica tiempo ni pierde el estado persistido.
10. La pérdida de red no genera tiempo ficticio.
11. El diseño funciona desde 360 px de ancho y también en desktop.
12. La PWA puede instalarse en navegadores compatibles.
13. El proyecto puede desplegarse usando exclusivamente planes
    gratuitos.
14. No hay secretos en Git ni errores de lint, TypeScript o tests
    críticos.

------------------------------------------------------------------------

## 14. Instrucciones para Claude Code

Actuá como un **ingeniero de software senior full-stack, arquitecto y
diseñador de producto**. Tu objetivo es implementar este proyecto de
forma completa, mantenible y segura, no solamente generar una maqueta
visual.

Reglas de trabajo:

1.  Primero inspeccioná el repositorio, los archivos existentes, las
    versiones y el entorno. No asumas que está vacío.
2.  Leé este documento completo antes de modificar nada.
3.  Antes de implementar, presentá un plan breve con arquitectura,
    dependencias, decisiones y riesgos. Si detectás una mejora
    importante, explicala y justificá el cambio.
4.  Priorizá una solución gratuita de punta a punta. No actives
    servicios pagos, trials ni recursos que requieran tarjeta. Si una
    función no puede ser gratuita, explicalo y proponé una alternativa.
5.  Verificá la documentación oficial vigente de Next.js, Supabase,
    Supabase Auth SSR, Vercel y PWA antes de elegir APIs o
    configuraciones. No uses APIs obsoletas ni inventes opciones.
6.  Implementá por fases siguiendo este README. Trabajá en código real,
    no dejes pseudocódigo, botones sin funcionalidad ni datos falsos
    presentados como persistidos.
7.  Mantené TypeScript estricto. Evitá `any`, duplicación y componentes
    gigantes.
8.  Separá UI, lógica de dominio, validación, persistencia y
    autorización.
9.  Seguridad primero: RLS en todas las tablas privadas, validación
    server-side y secretos solo en variables de entorno.
10. La lógica de acreditación del tiempo es la parte más crítica.
    Diseñala para evitar duplicados, saltos de reloj, heartbeats
    atrasados y tiempo acreditado en segundo plano. No confíes en el
    contador del frontend.
11. No afirmes que se puede detectar si alguien estudia realmente. La
    aplicación solo puede aproximar tiempo con la web visible y activa.
12. No simules compatibilidad móvil que no hayas probado. Documentá
    limitaciones de iOS y Android.
13. Escribí tests para reglas de negocio, permisos, idempotencia,
    tracking y transiciones de sesión.
14. Después de cada fase, ejecutá lint, typecheck y tests pertinentes.
    Corregí los errores antes de seguir.
15. No ocultes errores con `try/catch` vacíos, `@ts-ignore` o
    desactivando reglas.
16. Mantené `.env.example` actualizado y nunca escribas credenciales
    reales.
17. Al terminar, entregá instrucciones reproducibles para instalar,
    configurar Supabase, configurar Google OAuth, ejecutar localmente,
    correr tests y desplegar gratis.

**Importante sobre el alcance:** primero entregar un MVP completo y
sólido con Google OAuth, tareas, Pomodoro, tracking verificable, planta
y PWA. Apple Sign In queda preparado arquitectónicamente, pero no debe
implementarse de una manera que implique costos no informados. No
sacrifiques la confiabilidad del tracking por agregar funcionalidades
secundarias.

Empezá por la Fase 0. No implementes todo en una única respuesta:
inspeccioná, planificá y avanzá de forma incremental, manteniendo el
proyecto ejecutable en cada etapa.
