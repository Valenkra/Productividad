/** Error esperado de negocio: se traduce a una respuesta HTTP controlada. */
export class DomainError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
