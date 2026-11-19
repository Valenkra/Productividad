import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "@/components/layout/nav-items";

describe("NAV_ITEMS", () => {
  it("tiene rutas únicas que empiezan con /", () => {
    const hrefs = NAV_ITEMS.map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
    for (const h of hrefs) expect(h.startsWith("/")).toBe(true);
  });
});
