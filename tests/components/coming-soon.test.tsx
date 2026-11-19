// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { ComingSoon } from "@/components/feedback/coming-soon";

afterEach(cleanup);

it("indica con honestidad que la sección no está implementada y en qué fase llega", () => {
  render(<ComingSoon title="Tareas" phase="Fase 3" />);
  expect(screen.getByRole("heading", { name: "Tareas" })).toBeTruthy();
  expect(screen.getByText(/todavía no está implementada \(Fase 3\)/)).toBeTruthy();
});
