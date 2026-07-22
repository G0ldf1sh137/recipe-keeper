import { z } from "zod";

export const blockUserSchema = z.object({
  userId: z.string().min(1),
});

export const unblockUserSchema = z.object({
  userId: z.string().min(1),
});
