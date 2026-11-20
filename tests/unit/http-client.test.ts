import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/http/client";

const respond = (status: number, body: string) =>
  vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(
    async () => new Response(body, { status }),
  );

afterEach(() => vi.unstubAllGlobals());

describe("apiFetch", () => {
  it("GET sin caché y devuelve el JSON", async () => {
    const fetchSpy = respond(200, JSON.stringify({ ok: 1 }));
    vi.stubGlobal("fetch", fetchSpy);
    await expect(apiFetch<{ ok: number }>("/api/x")).resolves.toEqual({ ok: 1 });
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("/api/x");
    expect(init?.method ?? "GET").toBe("GET");
    expect(init?.cache).toBe("no-store");
    expect(init?.body).toBeUndefined();
  });

  it("envía el cuerpo como JSON con su cabecera", async () => {
    const fetchSpy = respond(200, "{}");
    vi.stubGlobal("fetch", fetchSpy);
    await apiFetch("/api/x", { method: "PATCH", body: { a: 1 } });
    const [, init] = fetchSpy.mock.calls[0];
    expect(init?.method).toBe("PATCH");
    expect(init?.body).toBe('{"a":1}');
    expect(new Headers(init?.headers).get("Content-Type")).toBe("application/json");
  });

  it("un error del servidor se convierte en ApiError con su código y mensaje", async () => {
    vi.stubGlobal(
      "fetch",
      respond(
        409,
        JSON.stringify({ error: { code: "session_open", message: "Ya hay" } }),
      ),
    );
    const error = await apiFetch("/api/x").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: "session_open", message: "Ya hay" });
  });

  it("si el error no trae JSON usa un mensaje genérico con el status", async () => {
    vi.stubGlobal("fetch", respond(502, "<html>"));
    await expect(apiFetch("/api/x")).rejects.toMatchObject({
      status: 502,
      code: "http_error",
      message: "Error 502",
    });
  });

  it("los fallos de red no se disfrazan (siguen siendo TypeError)", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Failed to fetch");
    });
    await expect(apiFetch("/api/x")).rejects.toBeInstanceOf(TypeError);
  });
});
