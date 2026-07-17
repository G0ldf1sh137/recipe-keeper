import { z } from "zod";
import { visibilityValues, dayOfWeekValues } from "#/db/schema";

export const createCalendarSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const renameCalendarSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(100),
});

export const deleteCalendarSchema = z.object({
  id: z.string().min(1),
});

export const getCalendarSchema = z.object({
  id: z.string().min(1),
  shareToken: z.string().min(1).optional(),
});

export const calendarShareSchema = z.object({
  calendarId: z.string().min(1),
});

export const updateCalendarVisibilitySchema = z.object({
  id: z.string().min(1),
  visibility: z.enum(visibilityValues),
});

export const calendarsForRecipeSchema = z.object({
  recipeId: z.string().min(1),
});

export const addEntryToCalendarSchema = z.object({
  calendarId: z.string().min(1),
  recipeId: z.string().min(1),
  dayOfWeek: z.enum(dayOfWeekValues),
});

export const removeEntryFromCalendarSchema = z.object({
  calendarId: z.string().min(1),
  entryId: z.string().min(1),
});

export const moveEntryInCalendarSchema = z.object({
  calendarId: z.string().min(1),
  entryId: z.string().min(1),
  direction: z.enum(["up", "down"]),
});
