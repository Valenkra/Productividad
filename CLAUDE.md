@AGENTS.md

# Focus Garden — instrucciones del proyecto

La especificación está en `docs/SPEC.md`. El proceso de desarrollo está en `docs/TDD.md`.

## Desarrollo guiado por tests (obligatorio)

1. **Rojo primero:** antes de tocar código de producción, escribí el test, ejecutalo y
   comprobá que falla por la razón correcta. Mostralo en el resumen ("falló con X").
2. **Verde mínimo:** el código más simple que lo hace pasar.
3. **Refactor en verde:** sin cambiar tests.
4. Un bug = primero un test que lo reproduce.
5. Nunca debilites, borres ni saltees un test para que pase; si un test es incorrecto,
   explicá por qué y corregilo a la vista.
6. Antes de dar algo por terminado: `npm run verify` y `npm run build` limpios.
7. La lógica recibe el reloj por inyección (`now`); los tests no usan tiempo real.

## Comandos

- `npm run test:watch` · `npm test` · `npm run test:coverage` · `npm run verify`

## Convenciones

- Next 16: `proxy.ts` (no `middleware.ts`); `cacheComponents` activo → las rutas de `/api`
  usan `handle()` de `src/server/http.ts` (llama `connection()` para no prerenderizarse).
- Persistencia detrás de `FocusRepository`; hoy en memoria (`MemoryFocusRepository`).
- Modo local: usuario fijo en `src/server/auth.ts` hasta conectar Supabase Auth.
- Sin `any`, sin `@ts-ignore`, sin desactivar reglas de lint.
