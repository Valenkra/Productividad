import { requireUserId } from "@/server/auth";
import { getGardenService } from "@/server/container";
import { handle } from "@/server/http";

export function GET() {
  return handle(async () => getGardenService().getGarden(await requireUserId()));
}
