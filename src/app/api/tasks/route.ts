import { createTaskSchema, listQuerySchema } from "@/features/tasks/schema";
import { requireUserId } from "@/server/auth";
import { getTaskService } from "@/server/container";
import { handle, parseBody } from "@/server/http";

export function GET(request: Request) {
  return handle(async () => {
    const userId = await requireUserId();
    const query = listQuerySchema.parse(
      Object.fromEntries(new URL(request.url).searchParams),
    );
    return { tasks: await getTaskService().list(userId, query) };
  });
}

export function POST(request: Request) {
  return handle(async () => {
    const userId = await requireUserId();
    const input = await parseBody(request, createTaskSchema);
    return { task: await getTaskService().create(userId, input) };
  });
}
