import { expect, test } from "@playwright/test";

test("el manifest es válido y sus íconos se sirven como imagen", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.display).toBe("standalone");
  expect(manifest.lang).toBe("es");
  for (const icon of manifest.icons as { src: string }[]) {
    const r = await request.get(icon.src);
    expect(r.status(), icon.src).toBe(200);
    expect(r.headers()["content-type"]).toContain("image/png");
  }
});

test("/sw.js se sirve sin caché y con los headers de seguridad", async ({ request }) => {
  const res = await request.get("/sw.js");
  expect(res.headers()["cache-control"]).toContain("no-store");
  expect(res.headers()["content-type"]).toContain("javascript");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
});

test("el service worker se registra y controla la página", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  const controlled = await page.evaluate(() => !!navigator.serviceWorker.controller);
  expect(controlled).toBe(true);
});

test("sin conexión, una navegación nueva muestra la página offline", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload(); // ya controlada por el SW
  await context.setOffline(true);
  await page.goto("/dashboard").catch(() => {});
  await expect(page.getByRole("heading", { name: "Estás sin conexión" })).toBeVisible();
});

test("la API nunca queda en la caché del service worker", async ({ page }) => {
  await page.goto("/dashboard");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.request.get("/api/garden");
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      for (const req of await (await caches.open(name)).keys()) urls.push(req.url);
    }
    return urls;
  });
  expect(cached.filter((u) => u.includes("/api/"))).toEqual([]);
});

test("humo funcional: en /focus se puede iniciar una sesión y corre el temporizador", async ({
  page,
}) => {
  // Sin esto, la guarda de onboarding redirige a /onboarding.
  await page.request.patch("/api/settings", { data: { onboardingDone: true } });
  await page.goto("/focus");
  await page
    .getByRole("button", { name: /empezar|iniciar/i })
    .first()
    .click();
  await expect(page.getByLabel(/^Quedan \d\d:\d\d$/)).toBeVisible();
  await expect(page.getByText("Contando tiempo")).toBeVisible();
});

test("a 360 px de ancho no hay scroll horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  for (const path of [
    "/",
    "/onboarding",
    "/focus",
    "/tasks",
    "/garden",
    "/history",
    "/settings",
  ]) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(overflow, path).toBe(false);
  }
});
