import { z } from "zod";

export const markRecipeMadeSchema = z.object({
  recipeId: z.string().min(1),
});

export const getMakeCountSchema = z.object({
  recipeId: z.string().min(1),
  shareToken: z.string().min(1).optional(),
});
