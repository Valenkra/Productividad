# PWA: qué está probado y qué falta probar a mano

## Automatizado (no requiere dispositivo)

- `tests/unit/service-worker.test.ts`: política del service worker en un sandbox (`node:vm`).
  `/api/*` nunca se intercepta ni se cachea, solo GET del mismo origen, estáticos cache-first,
  navegaciones network-first con `offline.html`, limpieza de cachés viejas, y una guarda
  que impide que `sw.js` mencione `heartbeat` o `focus-sessions` (no puede acreditar tiempo).
- `tests/unit/next-config.test.ts`: headers de seguridad y de `/sw.js`.
- `tests/components/pwa-runtime.test.tsx` y `install-help.test.tsx`: registro del SW, banner offline,
  ayuda de instalación por plataforma.
- `npm run test:e2e` (Chromium, build de producción): manifest e íconos, SW que controla la página,
  página offline, API fuera de caché, humo de `/focus`, sin scroll horizontal a 360 px.

## NO probado: requiere dispositivo real

Este entorno no tiene Android ni iOS. Antes de dar la PWA por validada, recorré esto:

### Android (Chrome)
- [ ] Instalar desde el menú ⋮ → «Instalar app»; el ícono (maskable) no se ve recortado.
- [ ] Abre en modo standalone, con la barra de color `#fbf5ee` (fondo de la paleta Suave).
- [ ] Iniciar un foco, bloquear la pantalla ≥ 1 min, desbloquear: la sesión debe quedar **pausada** y no haber acreditado el tiempo bloqueado.
- [ ] Modo avión: se ve el banner «Sin conexión» y, al recargar, `offline.html`.

### iOS (Safari)
- [ ] Compartir → «Agregar a inicio»; el ícono usa `apple-touch-icon`.
- [ ] La barra inferior respeta el área segura (no queda tapada por la barra de gestos).
- [ ] Con pantalla bloqueada o app en segundo plano, **no se acredita tiempo** (limitación conocida de iOS: la app debe estar en primer plano).
- [ ] Sin conexión: banner y `offline.html`.

## Limitaciones conocidas
- Sin notificaciones push ni sync en segundo plano (fuera de alcance; la spec prohíbe prometer tracking con pantalla bloqueada).
- El SW no guarda HTML de la app: sin conexión solo se ve `offline.html`.
- El SW solo se registra en producción (`next build && next start`).
