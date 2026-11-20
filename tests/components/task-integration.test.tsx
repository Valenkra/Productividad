// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFocusSession } from "@/features/focus-tracking/use-focus-session";
import { createTestService, installFakeApi, type FakeApi } from "../helpers/fake-api";

let ctx: ReturnType<typeof createTestService>;
let api: FakeApi;
const seed = (title: string, over: Record<string, unknown> = {}) =>
  ctx.tasks.create("u", {
    title,
    description: null,
    subject: null,
    estimatedPomodoros: 2,
    priority: "medium",
    dueAt: null,
    ...over,
  });

beforeEach(() => {
  ctx = createTestService();
  api = installFakeApi(ctx);
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  Object.defineProperty(navigator, "sendBeacon", {
    value: () => true,
    configurable: true,
  });
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useFocusSession.start con tarea", () => {
  it("envía el taskId elegido", async () => {
    const task = await seed("Cálculo");
    const { result } = renderHook(() => useFocusSession());
    await act(async () => {});
    await act(async () => {
      await result.current.start(task.id);
    });
    expect(api.calls.find((c) => c.method === "POST")!.body).toEqual({ taskId: task.id });
    expect(result.current.session?.taskId).toBe(task.id);
  });

  it("sin tarea no envía taskId", async () => {
    const { result } = renderHook(() => useFocusSession());
    await act(async () => {});
    await act(async () => {
      await result.current.start();
    });
    expect(api.calls.find((c) => c.method === "POST")!.body).toEqual({});
  });
});
