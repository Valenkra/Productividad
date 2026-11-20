import { z } from "zod";
import { SUBJECT_IDS } from "./subjects";

const title = z.string().trim().min(1).max(200);
const description = z.string().max(2000).nullable();
const priority = z.enum(["low", "medium", "high"]);
const status = z.enum(["todo", "in_progress", "done", "archived"]);
const subject = z.enum(SUBJECT_IDS).nullable();
const estimatedPomodoros = z.number().int().min(1).max(12);
const dueAt = z.number().int().nonnegative().nullable();

/** `status` y `userId` NO se aceptan al crear: los fija el servidor. */
export const createTaskSchema = z.object({
  title,
  description: description.default(null),
  subject: subject.default(null),
  estimatedPomodoros: estimatedPomodoros.default(2),
  priority: priority.default("medium"),
  dueAt: dueAt.default(null),
});
export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = z
  .object({
    title,
    description,
    subject,
    estimatedPomodoros,
    priority,
    status,
    dueAt,
    position: z.number().int().nonnegative(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Sin cambios" });
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const SORTS = ["manual", "due", "priority", "created"] as const;
export type TaskSort = (typeof SORTS)[number];

export const listQuerySchema = z.object({
  status: z.enum(["todo", "in_progress", "done", "archived", "all"]).optional(),
  priority: priority.optional(),
  sort: z.enum(SORTS).default("manual"),
});
export type ListQuery = z.infer<typeof listQuerySchema>;
