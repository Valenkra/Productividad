/*
 * Service worker de Focus Garden. Solo da instalabilidad y una pantalla sin conexión.
 *
 * REGLA DE PRODUCTO: un service worker puede ejecutarse en segundo plano, así que NO
 * puede demostrar que la persona está presente. Por eso este archivo no hace tracking
 * ni cachea datos de la API: el tiempo lo valida solo el servidor.
 */
const VERSION = "focus-garden-v1";
const OFFLINE_URL = "/offline.html";

function isStatic(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(VERSION).then((cache) => cache.addAll([OFFLINE_URL])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n.startsWith("focus-garden-") && n !== VERSION)
            .map((n) => caches.delete(n)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Datos de la API: siempre a la red, nunca por caché (pueden ser privados y definen el crédito).
  if (url.pathname.startsWith("/api/")) return;

  if (isStatic(url.pathname)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
            return response;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate") {
    // No se guarda el HTML de la app (con login serían datos privados): solo el aviso offline.
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
  }
});
