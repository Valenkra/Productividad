import { requireUserId } from "@/server/auth";
import { getStatsService } from "@/server/container";
import { handle } from "@/server/http";

export function GET(request: Request) {
  return handle(async () => {
    const userId = await requireUserId();
    const tz = new URL(request.url).searchParams.get("tz") ?? "UTC";
    return getStatsService().getStats(userId, tz);
  });
}
