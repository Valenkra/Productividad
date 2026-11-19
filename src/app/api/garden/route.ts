import { requireUserId } from "@/server/auth";
import { getFocusService } from "@/server/container";
import { handle } from "@/server/http";

export function GET() {
  return handle(async () => getFocusService().getGarden(await requireUserId()));
}
