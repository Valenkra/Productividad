import { describe, expect, it } from "vitest";
import { LOCAL_USER_ID, requireUserId } from "@/server/auth";
import { getFocusService, getTaskService } from "@/server/container";

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

describe("container: tareas y sesiones comparten el mismo almacén", () => {
  it("una sesión puede asociarse a una tarea creada con el servicio real", async () => {
    const task = await getTaskService().create("wiring-user", {
      title: "Probar el cableado",
      description: null,
      subject: null,
      estimatedPomodoros: 2,
      priority: "medium",
      dueAt: null,
    });
    const { session } = await getFocusService().start("wiring-user", { taskId: task.id });
    expect(session?.taskId).toBe(task.id);
  });

  it("no acepta tareas de otro usuario", async () => {
    const task = await getTaskService().create("dueño", {
      title: "Ajena",
      description: null,
      subject: null,
      estimatedPomodoros: 2,
      priority: "low",
      dueAt: null,
    });
    await expect(
      getFocusService().start("intruso", { taskId: task.id }),
    ).rejects.toMatchObject({ code: "task_not_found" });
  });
});
