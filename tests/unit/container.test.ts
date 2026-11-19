import { describe, expect, it } from "vitest";
import { LOCAL_USER_ID, requireUserId } from "@/server/auth";
import { getFocusService } from "@/server/container";

describe("container", () => {
  it("es un singleton: el estado persiste entre llamadas", async () => {
    const a = getFocusService();
    expect(getFocusService()).toBe(a);
    const { session } = await a.start("container-test", {});
    const active = await getFocusService().getActive("container-test");
    expect(active.session?.id).toBe(session!.id);
  });
});

describe("auth (modo local)", () => {
  it("devuelve el usuario local fijo", async () => {
    expect(await requireUserId()).toBe(LOCAL_USER_ID);
  });
});
