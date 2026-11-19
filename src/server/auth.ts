/**
 * Identidad del usuario. MODO LOCAL: no hay autenticación todavía, hay un único usuario.
 * En la Fase 2 esto debe leer la sesión de Supabase Auth (y responder 401 si no hay).
 */
export const LOCAL_USER_ID = "local-user";

export async function requireUserId(): Promise<string> {
  return LOCAL_USER_ID;
}
