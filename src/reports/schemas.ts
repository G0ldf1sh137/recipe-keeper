import { z } from "zod";

export const reportRecipeSchema = z.object({
  recipeId: z.string().min(1),
  reason: z.string().trim().min(1).max(500),
});

export const reportCommentSchema = z.object({
  commentId: z.string().min(1),
  reason: z.string().trim().min(1).max(500),
});

export const reportMessageSchema = z.object({
  messageId: z.string().min(1),
  reason: z.string().trim().min(1).max(500),
});

export const resolveReportSchema = z.object({
  reportId: z.string().min(1),
});
