import { describe, expect, it } from "vitest";
import { isOpenTask } from "@/features/tasks/domain";
import type { Task } from "@/features/tasks/types";

const task = (over: Partial<Task> = {}): Task => ({
  id: "t",
  userId: "u",
  title: "x",
  description: null,
  subject: null,
  estimatedPomodoros: 2,
  status: "todo",
  priority: "medium",
  dueAt: 1000,
  completedAt: null,
  position: 1,
  createdAt: 0,
  updatedAt: 0,
  ...over,
});

describe("isOpenTask", () => {
  it("abierta = pendiente o en curso", () => {
    expect(isOpenTask(task({ status: "todo" }))).toBe(true);
    expect(isOpenTask(task({ status: "in_progress" }))).toBe(true);
  });

  it("hechas y archivadas no están abiertas", () => {
    expect(isOpenTask(task({ status: "done" }))).toBe(false);
    expect(isOpenTask(task({ status: "archived" }))).toBe(false);
  });
});
