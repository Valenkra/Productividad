import { requireUserId } from "@/server/auth";
import { getFocusService } from "@/server/container";
import { handle } from "@/server/http";

export function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    return getFocusService().resume(userId, id);
  });
}
