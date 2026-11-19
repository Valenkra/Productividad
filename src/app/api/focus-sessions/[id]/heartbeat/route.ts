import { heartbeatSchema } from "@/lib/validation/focus";
import { requireUserId } from "@/server/auth";
import { getFocusService } from "@/server/container";
import { handle, parseBody } from "@/server/http";

export function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const userId = await requireUserId();
    const { id } = await ctx.params;
    const { idempotencyKey } = await parseBody(request, heartbeatSchema);
    return getFocusService().heartbeat(userId, id, idempotencyKey);
  });
}
