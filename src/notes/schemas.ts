import { z } from "zod";

export const getNoteSchema = z.object({
  recipeId: z.string().min(1),
});

export const saveNoteSchema = z.object({
  recipeId: z.string().min(1),
  text: z.string().max(2000),
});
