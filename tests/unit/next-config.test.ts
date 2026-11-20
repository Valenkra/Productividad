import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

type Rule = { source: string; headers: { key: string; value: string }[] };

async function rules(): Promise<Rule[]> {
  const headers = nextConfig.headers;
  if (!headers) throw new Error("next.config no define headers()");
  return (await headers()) as Rule[];
}

const valueOf = (rule: Rule | undefined, key: string) =>
  rule?.headers.find((h) => h.key.toLowerCase() === key.toLowerCase())?.value;

describe("headers de seguridad", () => {
  it("todas las rutas llevan nosniff, anti-iframe y referrer-policy", async () => {
    const all = (await rules()).find((r) => r.source === "/(.*)");
    expect(valueOf(all, "X-Content-Type-Options")).toBe("nosniff");
    expect(valueOf(all, "X-Frame-Options")).toBe("DENY");
    expect(valueOf(all, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });

  it("/sw.js no se cachea, es JavaScript y solo permite scripts propios", async () => {
    const sw = (await rules()).find((r) => r.source === "/sw.js");
    expect(valueOf(sw, "Content-Type")).toBe("application/javascript; charset=utf-8");
    expect(valueOf(sw, "Cache-Control")).toBe("no-cache, no-store, must-revalidate");
    expect(valueOf(sw, "Content-Security-Policy")).toBe(
      "default-src 'self'; script-src 'self'",
    );
  });
});
