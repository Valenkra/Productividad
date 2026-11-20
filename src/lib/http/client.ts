/** Error HTTP con el formato `{ error: { code, message } }` que devuelve `handle()`. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Único cliente JSON de la app: sin caché, cuerpo serializado y errores del servidor como
 * `ApiError`. Un fallo de red sigue siendo `TypeError` (así se distingue "sin conexión").
 */
export async function apiFetch<T>(
  path: string,
  { method = "GET", body }: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(
      res.status,
      error?.code ?? "http_error",
      error?.message ?? `Error ${res.status}`,
    );
  }
  return data as T;
}
