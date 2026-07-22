import { z } from "zod";

// targetDate is a calendar date with no meaningful time-of-day component (see
// the UTC-getter convention used everywhere else this field is read), so
// "today" is anchored to UTC here too rather than the requester's local time.
function isNotPastUTCDate(date: Date): boolean {
  const now = new Date();
  const todayUTC = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return date.getTime() >= todayUTC;
}

export const createPollSchema = z.object({
  title: z.string().trim().min(1).max(150),
  targetDate: z.coerce.date().refine(isNotPastUTCDate, { message: "Date can't be in the past." }),
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
