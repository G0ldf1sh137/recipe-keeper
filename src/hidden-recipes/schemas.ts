import { z } from "zod";

export const hideRecipeSchema = z.object({
  recipeId: z.string().min(1),
});
