import { z } from "zod";

export const muteUserSchema = z.object({
  userId: z.string().min(1),
});

export const unmuteUserSchema = z.object({
  userId: z.string().min(1),
});
