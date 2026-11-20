# Focus Garden

Temporizador Pomodoro para estudiar: en cada pomodoro crece una planta, de semilla a flor,
y si lo terminás florece y se queda en tu jardín. El tiempo solo cuenta con la app visible y
en primer plano, y lo valida el servidor.

Hoy funciona **en modo local**: un usuario fijo y datos en memoria (se pierden al reiniciar
el servidor). Supabase y el login con Google vienen en la Fase 2.

## Correrlo

```bash
npm install
npm run dev          # http://localhost:3000  (la app está en /focus)
```

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run test:watch` | Modo TDD: re-ejecuta los tests al guardar |
| `npm test` | Suite completa (Vitest) |
| `npm run test:coverage` | Tests con umbrales de cobertura |
| `npm run verify` | lint + typecheck + cobertura + build (antes de cada commit) |
| `npm run test:e2e` | Playwright sobre un build de producción (PWA/SW) |
| `npm run icons` | Regenera los íconos de la PWA |

## Estructura

```
src/
  app/                 rutas (App Router). Las páginas solo montan la feature.
    (app)/             app interior: Foco, Tareas, Jardín, Stats, Ajustes (+ SettingsProvider y gate de onboarding)
    api/               Route Handlers: handle() + requireUserId() + zod
  features/<feature>/  UI, hooks, api.ts (cliente) y reglas puras (domain.ts, stats.ts…)
  components/ui/       piezas compartidas: BottomSheet, Dialog, Stepper, Switch, styles.ts
  lib/                 http/client.ts (apiFetch), time/, utils/, validation/, pwa/
  server/
    services/          index.ts (createServices) + focus, tasks, settings, stats, garden
    repositories/      interfaces + implementaciones en memoria
    container.ts       singletons de la app
tests/                 unit · integration · components · e2e (ver docs/TDD.md)
```

## Documentación

- `docs/SPEC.md`: especificación del producto.
- `docs/TDD.md`: cómo se desarrolla (test rojo primero, siempre).
- `docs/NEXT-STEPS.md`: estado y próximos pasos.
- `docs/PWA-TESTING.md`: qué falta probar en dispositivos reales.
- `docs/design/`: referencia del rediseño «Pastel juguetón» (2b).
- `INFORME_DE_FLUJO.md`: evaluación del repo y del flujo de datos.
