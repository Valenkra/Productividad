import { readFileSync } from "node:fs";
import { join } from "node:path";
import vm from "node:vm";
import { beforeEach, describe, expect, it } from "vitest";

const SW_PATH = join(process.cwd(), "public", "sw.js");
const ORIGIN = "https://app.test";

interface FakeRequest {
  url: string;
  method: string;
  mode?: string;
}
interface FetchEventLike {
  request: FakeRequest;
  respondWith: (p: Promise<unknown>) => void;
}

/** Caché falsa en memoria: varias cachés con nombre, claves = url. */
function createFakeCaches() {
  const stores = new Map<string, Map<string, unknown>>();
  const store = (name: string) => {
    let s = stores.get(name);
    if (!s) stores.set(name, (s = new Map()));
    return s;
  };
  return {
    stores,
    open: async (name: string) => ({
      // Como `caches.open` real: abrir crea la caché aunque esté vacía.
      ...(store(name), {}),
      addAll: async (urls: string[]) =>
        urls.forEach((u) => store(name).set(u, `precache:${u}`)),
      put: async (req: FakeRequest, res: unknown) => void store(name).set(req.url, res),
    }),
    match: async (req: FakeRequest | string) => {
      const key = typeof req === "string" ? `${ORIGIN}${req}` : req.url;
      for (const s of stores.values()) {
        if (s.has(key)) return s.get(key);
        if (typeof req === "string" && s.has(req)) return s.get(req);
      }
      return undefined;
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  };
}

function loadSw() {
  const listeners: Record<string, (e: unknown) => void> = {};
  const caches = createFakeCaches();
  const networkCalls: string[] = [];
  let networkDown = false;
  const state = { skipWaiting: 0, claimed: 0 };

  const fetchFn = async (req: FakeRequest) => {
    networkCalls.push(req.url);
    if (networkDown) throw new TypeError("offline");
    return {
      ok: true,
      url: req.url,
      clone() {
        return this;
      },
    };
  };

  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, cb: (e: unknown) => void) =>
      void (listeners[type] = cb),
    skipWaiting: () => void state.skipWaiting++,
    clients: { claim: async () => void state.claimed++ },
  };

  const source = readFileSync(SW_PATH, "utf8");
  vm.runInNewContext(source, { self, caches, fetch: fetchFn, URL, Promise, console });

  const waitable = async (type: string) => {
    let pending: Promise<unknown> = Promise.resolve();
    listeners[type]({ waitUntil: (p: Promise<unknown>) => void (pending = p) });
    await pending;
  };

  const doFetch = async (req: FakeRequest) => {
    let responded: Promise<unknown> | undefined;
    const event: FetchEventLike = {
      request: req,
      respondWith: (p) => void (responded = p),
    };
    listeners.fetch(event);
    return {
      intercepted: responded !== undefined,
      response: responded ? await responded : undefined,
    };
  };

  return {
    caches,
    networkCalls,
    state,
    install: () => waitable("install"),
    activate: () => waitable("activate"),
    fetch: doFetch,
    setOffline: (v: boolean) => void (networkDown = v),
  };
}

const get = (path: string, mode = "same-origin"): FakeRequest => ({
  url: `${ORIGIN}${path}`,
  method: "GET",
  mode,
});

describe("service worker: política de seguridad", () => {
  let sw: ReturnType<typeof loadSw>;
  beforeEach(() => {
    sw = loadSw();
  });

  it("al instalar precachea la página offline y toma el control sin esperar", async () => {
    await sw.install();
    expect(await sw.caches.match("/offline.html")).toBeDefined();
    expect(sw.state.skipWaiting).toBe(1);
  });

  it("al activar borra las cachés de versiones anteriores y reclama los clientes", async () => {
    await sw.caches.open("focus-garden-v0-vieja");
    await sw.caches.stores.get("focus-garden-v0-vieja")?.set("x", 1);
    await sw.caches.open("otra-app");
    await sw.caches.stores.get("otra-app")?.set("y", 1);
    await sw.install();
    await sw.activate();
    const names = [...sw.caches.stores.keys()];
    expect(names).not.toContain("focus-garden-v0-vieja");
    expect(names).toContain("otra-app"); // no toca cachés ajenas
    expect(names.some((n) => n.startsWith("focus-garden-"))).toBe(true);
    expect(sw.state.claimed).toBe(1);
  });

  it("no intercepta métodos distintos de GET", async () => {
    for (const method of ["POST", "PATCH", "DELETE", "PUT"]) {
      const r = await sw.fetch({ ...get("/_next/static/a.js"), method });
      expect(r.intercepted).toBe(false);
    }
  });

  it("no intercepta otros orígenes", async () => {
    const r = await sw.fetch({
      url: "https://evil.test/_next/static/a.js",
      method: "GET",
    });
    expect(r.intercepted).toBe(false);
  });

  it("NUNCA toca /api/*: ni la intercepta ni la cachea (network-only)", async () => {
    for (const path of [
      "/api/focus-sessions/abc/heartbeat",
      "/api/focus-sessions/active",
      "/api/garden",
      "/api/stats?tz=UTC",
    ]) {
      const r = await sw.fetch(get(path));
      expect(r.intercepted).toBe(false);
    }
    expect(sw.networkCalls).toEqual([]); // el SW ni siquiera hace fetch propio
    expect([...sw.caches.stores.values()].every((s) => s.size === 0)).toBe(true);
  });

  it("estáticos: cache-first; la primera vez va a red y guarda, la segunda sale de caché", async () => {
    await sw.install();
    const req = get("/_next/static/chunks/app.js");
    const first = await sw.fetch(req);
    expect(first.intercepted).toBe(true);
    expect(sw.networkCalls).toEqual([req.url]);
    const second = await sw.fetch(req);
    expect(second.intercepted).toBe(true);
    expect(sw.networkCalls).toHaveLength(1); // no volvió a la red
  });

  it("cachea solo estáticos permitidos: /_next/static, /icons y el manifest", async () => {
    await sw.install();
    for (const p of [
      "/_next/static/x.css",
      "/icons/icon-192.png",
      "/manifest.webmanifest",
    ]) {
      expect((await sw.fetch(get(p))).intercepted).toBe(true);
    }
    // Otro recurso del mismo origen (p. ej. una imagen cualquiera) no se cachea.
    expect((await sw.fetch(get("/algo.json"))).intercepted).toBe(false);
  });

  it("navegaciones: network-first, sin guardar el HTML de la app", async () => {
    await sw.install();
    const nav = get("/dashboard", "navigate");
    const r = await sw.fetch(nav);
    expect(r.intercepted).toBe(true);
    expect(sw.networkCalls).toEqual([nav.url]);
    expect(await sw.caches.match(nav)).toBeUndefined();
  });

  it("navegación sin red: responde la página offline", async () => {
    await sw.install();
    sw.setOffline(true);
    const r = await sw.fetch(get("/dashboard", "navigate"));
    expect(r.response).toBe("precache:/offline.html");
  });

  it("el SW no puede acreditar tiempo: su código no menciona sesiones de foco ni heartbeat", () => {
    const source = readFileSync(SW_PATH, "utf8");
    expect(source).not.toMatch(/heartbeat/i);
    expect(source).not.toMatch(/focus-sessions/i);
    // "/api/" aparece una sola vez: en la regla de exclusión.
    expect(source.match(/\/api\//g)?.length ?? 0).toBe(1);
  });
});
