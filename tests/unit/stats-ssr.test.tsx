// @vitest-environment node
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { StatsView } from "@/features/history/stats-view";

describe("StatsView en el servidor", () => {
  it("renderiza «Cargando…» (igual que el primer render del cliente), no un error", () => {
    // Sin `window` no hay zona horaria todavía: no es un fallo, es que aún no se pidió.
    const html = renderToString(<StatsView />);
    expect(html).toContain("Cargando");
    expect(html).not.toContain("No se pudieron cargar");
  });
});
