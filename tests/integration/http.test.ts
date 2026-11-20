import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { DomainError } from "@/server/errors";

// `connection()` solo existe dentro de una petición de Next; aquí se neutraliza.
vi.mock("next/server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/server")>()),
  connection: async () => {},
}));

const { handle, parseBody } = await import("@/server/http");

const post = (body: string) => new Request("http://x/api", { method: "POST", body });

describe("handle", () => {
  it("responde 200 con JSON y sin caché", async () => {
    const res = await handle(async () => ({ ok: true }));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: true });
  });

  it("traduce DomainError a su status y código", async () => {
    const res = await handle(async () => {
      throw new DomainError("session_open", 409, "Ya hay una sesión");
    });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: { code: "session_open", message: "Ya hay una sesión" },
    });
  });

  it("traduce ZodError a 400 sin filtrar detalles internos", async () => {
    const res = await handle(async () => z.object({ a: z.string() }).parse({}));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: "validation", message: "Datos inválidos" },
    });
  });

  it("errores inesperados → 500 genérico (no expone el mensaje) y se registran", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await handle(async () => {
      throw new Error("password de la base: hunter2");
    });
    expect(res.status).toBe(500);
    expect(JSON.stringify(await res.json())).not.toContain("hunter2");
    expect(log).toHaveBeenCalled();
  });
});

describe("parseBody", () => {
  const schema = z.object({ n: z.number().default(7) });

  it("parsea JSON válido", async () => {
    expect(await parseBody(post('{"n": 3}'), schema)).toEqual({ n: 3 });
  });

  it("cuerpo vacío se trata como {}", async () => {
    expect(await parseBody(post(""), schema)).toEqual({ n: 7 });
  });

  it("JSON inválido → DomainError 400", async () => {
    await expect(parseBody(post("{no json"), schema)).rejects.toMatchObject({
      code: "invalid_json",
      status: 400,
    });
  });

  it("falla de validación → ZodError", async () => {
    await expect(parseBody(post('{"n":"x"}'), schema)).rejects.toBeInstanceOf(z.ZodError);
  });
});
