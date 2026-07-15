import { z } from "zod";

export const rateRecipeSchema = z.object({
  recipeId: z.string().min(1),
  value: z.number().int().min(1).max(5),
});

export const getRatingSummarySchema = z.object({
  recipeId: z.string().min(1),
});
