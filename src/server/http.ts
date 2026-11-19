import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";
import { DomainError } from "./services/focus-service";

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let json: unknown = {};
  const text = await request.text();
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      throw new DomainError("invalid_json", 400, "JSON inválido");
    }
  }
  return schema.parse(json);
}

/** Ejecuta un handler traduciendo errores de dominio y validación a respuestas HTTP. */
export async function handle(fn: () => Promise<unknown>): Promise<NextResponse> {
  try {
    return NextResponse.json(await fn(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof DomainError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: { code: "validation", message: "Datos inválidos" } },
        { status: 400 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: { code: "internal", message: "Error interno" } },
      { status: 500 },
    );
  }
}
