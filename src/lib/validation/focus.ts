import { z } from "zod";

export const startSessionSchema = z.object({
  taskId: z.string().uuid().nullish(),
  mode: z.enum(["focus", "short_break", "long_break"]).optional(),
});

/** El cliente NUNCA envía segundos: solo una clave para deduplicar reintentos. */
export const heartbeatSchema = z.object({
  idempotencyKey: z.string().min(8).max(100),
});

export const finishSchema = z.object({
  outcome: z.enum(["completed", "abandoned"]),
});
