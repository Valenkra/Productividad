import { startSessionSchema } from "@/lib/validation/focus";
import { requireUserId } from "@/server/auth";
import { getFocusService } from "@/server/container";
import { handle, parseBody } from "@/server/http";

export function POST(request: Request) {
  return handle(async () => {
    const userId = await requireUserId();
    const input = await parseBody(request, startSessionSchema);
    return getFocusService().start(userId, input);
  });
}
