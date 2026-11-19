import { updateTaskSchema } from "@/features/tasks/schema";
import { requireUserId } from "@/server/auth";
import { getTaskService } from "@/server/container";
import { handle, parseBody } from "@/server/http";

type Ctx = { params: Promise<{ id: string }> };

export function PATCH(request: Request, ctx: Ctx) {
  return handle(async () => {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const patch = await parseBody(request, updateTaskSchema);
    return { task: await getTaskService().update(userId, id, patch) };
  });
}

export function DELETE(_request: Request, ctx: Ctx) {
  return handle(async () => {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    await getTaskService().remove(userId, id);
    return { deleted: true };
  });
}
