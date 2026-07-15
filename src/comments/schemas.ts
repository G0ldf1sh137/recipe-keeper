import { z } from "zod";

export const createCommentSchema = z.object({
  recipeId: z.string().min(1),
  parentId: z.string().min(1).optional(),
  body: z.string().trim().min(1).max(2000),
});

export const listCommentsSchema = z.object({
  recipeId: z.string().min(1),
});
