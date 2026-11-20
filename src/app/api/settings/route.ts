import { updateSettingsSchema } from "@/features/settings/schema";
import { requireUserId } from "@/server/auth";
import { getSettingsService } from "@/server/container";
import { handle, parseBody } from "@/server/http";

export function GET() {
  return handle(async () => getSettingsService().getSettings(await requireUserId()));
}

export function PATCH(request: Request) {
  return handle(async () => {
    const userId = await requireUserId();
    const patch = await parseBody(request, updateSettingsSchema);
    return getSettingsService().updateSettings(userId, patch);
  });
}
