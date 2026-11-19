# Desarrollo guiado por tests (TDD)

Este proyecto se desarrolla con TDD. Regla única: **no se escribe código de producción
sin un test que falle primero.**

## El ciclo (por cada comportamiento pequeño)

1. **Rojo** – Escribir UN test que describa el comportamiento esperado. Ejecutarlo y
   **ver que falla por la razón correcta** (no por un error de import o de sintaxis).
2. **Verde** – Escribir el código mínimo que lo hace pasar. Nada de "ya que estoy".
3. **Refactor** – Con todo en verde, limpiar (nombres, duplicación, estructura). Los
   tests no cambian en este paso; si hay que cambiarlos, no era un refactor.
4. Repetir. Un ciclo dura minutos, no horas.

Para un bug: primero un test que lo reproduce (rojo), luego el arreglo (verde).

## Qué testear en cada capa

| Capa | Dónde | Cómo |
| --- | --- | --- |
| Reglas de negocio puras (`domain.ts`, `stats.ts`, `growth.ts`, `sequence.ts`) | `tests/unit` | Sin mocks. Entradas/salidas, límites exactos (`=`, `±1`), no mutar entradas. |
| Servicios (`focus-service`) | `tests/unit` | Repositorio en memoria + reloj inyectado (`now`). Nunca `Date.now()` real. |
| Esquemas Zod | `tests/unit` | Casos válidos, inválidos y extremos. |
| HTTP / rutas | `tests/integration` | Llamar el handler (`POST(req)`) y verificar status, cuerpo y errores. |
| Hooks y vistas React | `tests/components` | jsdom + `tests/helpers/fake-api.ts` (servicio real detrás de `fetch`) + timers falsos. |
| Flujos completos | `tests/e2e` (Playwright, `npm run test:e2e`, build real) | Solo caminos críticos; no entra en `verify`, se corre al cerrar fases con PWA/SW. |

Los tests describen **comportamiento observable** (qué ve el usuario, qué responde la API),
no detalles internos. Se consultan elementos por rol/etiqueta accesible, no por clases CSS.

## Reglas específicas de este proyecto

- **Tiempo y reloj:** la lógica recibe `now` por parámetro/inyección. Los tests controlan el
  tiempo; ninguno depende del reloj real ni de `sleep`.
- **Tracking:** toda regla de acreditación (tope, timeout, idempotencia, pausa, descansos,
  aislamiento entre usuarios) debe tener un test que falle si la regla se rompe.
- **Sin sobre-mocking:** se prefiere el servicio real con repositorio en memoria antes que
  mocks de cada método. Se mockea solo la frontera (red, `next/server`, navegador).
- **Un test falla por una sola razón** y su nombre dice el comportamiento en español.
- **Cuando se conecte Supabase:** el repositorio de Supabase debe pasar la misma batería de
  tests de contrato que `MemoryFocusRepository` (RLS incluido).

## Comandos

```bash
npm run test:watch     # modo TDD: re-ejecuta al guardar
npm test               # suite completa, una vez
npm run test:coverage  # con umbrales (líneas/sentencias/funciones 90 %, ramas 85 %)
npm run verify         # lint + typecheck + tests con cobertura + build (antes de cada commit)
```

La cobertura es una **red de seguridad, no el objetivo**: un 100 % sin aserciones no vale.
Para comprobar que los tests detectan errores de verdad, hacer una **mutación manual**:
romper a propósito una regla (por ejemplo subir `MAX_CREDIT_SECONDS`) y confirmar que la
suite falla; luego revertir. Los tests de tracking deben matar estas mutaciones.

## Definición de "terminado" para cualquier cambio

- [ ] Hay un test que falló antes del cambio y pasa después.
- [ ] `npm run verify` (incluye `build`) pasa sin errores ni warnings nuevos. El build detecta
      lo que jsdom no ve, p. ej. `Date.now()` en el render rompe el prerender de Next.
- [ ] No se desactivaron reglas, no se borraron ni se debilitaron tests para hacerlos pasar.
- [ ] Commits pequeños: idealmente uno por ciclo rojo→verde→refactor (o el test y su código juntos).

## Nota de historial

Las Fases 1–6 se escribieron antes de adoptar esta guía (código primero). Se corrigió con una
pasada retroactiva: tests de caracterización de todas las capas (cobertura 39 % → 97 %) y
verificación por mutaciones (17 reglas críticas rotas a propósito, 17 detectadas). Esa pasada
encontró un fallo real (el formulario de ajustes dejaba que la validación nativa tapara el
mensaje accesible). **Desde la Fase 3 en adelante, el orden es siempre test primero.**
