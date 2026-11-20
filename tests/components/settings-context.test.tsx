// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTestService, installFakeApi, type FakeApi } from "../helpers/fake-api";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

const { SettingsProvider, useSettings } =
  await import("@/features/settings/settings-context");
const { OnboardingGate } = await import("@/features/onboarding/onboarding-gate");

let ctx: ReturnType<typeof createTestService>;
let api: FakeApi;

beforeEach(async () => {
  ctx = createTestService();
  await ctx.settings.updateSettings("u", { onboardingDone: true, displayName: "Vale" });
  api = installFakeApi(ctx);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const settingsGets = () =>
  api.calls.filter((c) => c.method === "GET" && c.url.startsWith("/api/settings"));

function Name({ label }: { label: string }) {
  const { settings, setSettings } = useSettings();
  return (
    <>
      <p>{`${label}: ${settings?.displayName ?? "…"}`}</p>
      <button
        type="button"
        onClick={() => settings && setSettings({ ...settings, displayName: "Sol" })}
      >
        {`renombrar ${label}`}
      </button>
    </>
  );
}

describe("SettingsProvider", () => {
  it("el gate y las pantallas comparten UN solo pedido de ajustes", async () => {
    render(
      <SettingsProvider>
        <OnboardingGate>
          <Name label="a" />
          <Name label="b" />
        </OnboardingGate>
      </SettingsProvider>,
    );
    expect(await screen.findByText("a: Vale")).toBeTruthy();
    expect(screen.getByText("b: Vale")).toBeTruthy();
    expect(settingsGets()).toHaveLength(1);
  });

  it("un cambio guardado se ve en todas las pantallas sin volver a pedir", async () => {
    render(
      <SettingsProvider>
        <Name label="a" />
        <Name label="b" />
      </SettingsProvider>,
    );
    await screen.findByText("a: Vale");
    fireEvent.click(screen.getByRole("button", { name: "renombrar a" }));
    expect(screen.getByText("a: Sol")).toBeTruthy();
    expect(screen.getByText("b: Sol")).toBeTruthy();
    expect(settingsGets()).toHaveLength(1);
  });

  it("sin provider, useSettings pide los ajustes por su cuenta", async () => {
    render(<Name label="solo" />);
    await waitFor(() => expect(screen.getByText("solo: Vale")).toBeTruthy());
    expect(settingsGets()).toHaveLength(1);
  });
});
