import { z } from "zod";

export const createPollSchema = z.object({
  title: z.string().trim().min(1).max(150),
  targetDate: z.coerce.date(),
  targetCalendarId: z.string().min(1).optional(),
});

export const getPollSchema = z.object({
  id: z.string().min(1),
});

export const addPollOptionSchema = z.object({
  pollId: z.string().min(1),
  recipeId: z.string().min(1),
});

export const pollsForRecipeSchema = z.object({
  recipeId: z.string().min(1),
});

export const voteOnPollSchema = z.object({
  pollId: z.string().min(1),
  optionId: z.string().min(1),
});

export const closePollSchema = z.object({
  pollId: z.string().min(1),
});

export const deletePollSchema = z.object({
  id: z.string().min(1),
});
