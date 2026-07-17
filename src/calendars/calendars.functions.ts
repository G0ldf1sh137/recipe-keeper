import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import {
  createCalendarSchema,
  renameCalendarSchema,
  deleteCalendarSchema,
  getCalendarSchema,
  calendarsForRecipeSchema,
  calendarShareSchema,
  addEntryToCalendarSchema,
  removeEntryFromCalendarSchema,
  moveEntryInCalendarSchema,
  updateCalendarVisibilitySchema,
} from "./schemas";
import {
  createShareForCalendar,
  findCalendarsByOwner,
  findCalendarForViewer,
  findEntriesForCalendar,
  findShareTokenForCalendar,
  insertCalendar,
  renameOwnedCalendar,
  deleteOwnedCalendar,
  findCalendarsWithEntriesForRecipe,
  revokeShareForCalendar,
  addEntryToCalendar,
  removeEntryFromCalendar,
  moveEntryInCalendar,
  updateCalendarVisibility as updateOwnedCalendarVisibility,
} from "./calendars.server";
import { findRecipeById } from "#/recipes/recipes.server";
import { dayOfWeekValues } from "#/db/schema";
import { sessionMiddleware, requireAuthMiddleware } from "#/auth/auth-middleware";

export const listMyCalendars = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => findCalendarsByOwner(context.user.id));

export const getCalendar = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .validator(getCalendarSchema)
  .handler(async ({ data, context }) => {
    const isAdmin = context.user?.isAdmin ?? false;
    const calendar = await findCalendarForViewer(data.id, context.user?.id, data.shareToken, isAdmin);
    if (!calendar) throw notFound();
    const isOwner = calendar.ownerId === context.user?.id;
    const canManage = isOwner || isAdmin;
    const shareToken = isOwner ? await findShareTokenForCalendar(calendar.id, context.user!.id) : null;
    const entries = await findEntriesForCalendar(data.id);
    const entriesByDay = Object.fromEntries(
      dayOfWeekValues.map((day) => [day, entries.filter((entry) => entry.dayOfWeek === day)]),
    );
    return {
      calendar: { ...calendar, isOwner, canManage, shareUrl: shareToken ? `/shared/${shareToken}` : null },
      entriesByDay,
    };
  });

export const createCalendarShare = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(calendarShareSchema)
  .handler(async ({ data, context }) => {
    const token = await createShareForCalendar(data.calendarId, context.user.id);
    if (token === undefined) throw notFound();
    return { shareUrl: `/shared/${token}` };
  });

export const revokeCalendarShare = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(calendarShareSchema)
  .handler(async ({ data, context }) => {
    const result = await revokeShareForCalendar(data.calendarId, context.user.id);
    if (result === undefined) throw notFound();
    return { ok: true };
  });

export const updateCalendarVisibility = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(updateCalendarVisibilitySchema)
  .handler(async ({ data, context }) => {
    const updated = await updateOwnedCalendarVisibility(
      data.id,
      context.user.id,
      data.visibility,
      context.user.isAdmin,
    );
    if (!updated) throw notFound();
    return updated;
  });

export const createCalendar = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(createCalendarSchema)
  .handler(async ({ data, context }) => insertCalendar(data.name, context.user.id));

export const renameCalendar = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(renameCalendarSchema)
  .handler(async ({ data, context }) => {
    const updated = await renameOwnedCalendar(data.id, context.user.id, data.name, context.user.isAdmin);
    if (!updated) throw notFound();
    return updated;
  });

export const deleteCalendar = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(deleteCalendarSchema)
  .handler(async ({ data, context }) => {
    const deleted = await deleteOwnedCalendar(data.id, context.user.id, context.user.isAdmin);
    if (!deleted) throw notFound();
    return deleted;
  });

export const getCalendarsForRecipe = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .validator(calendarsForRecipeSchema)
  .handler(async ({ data, context }) => findCalendarsWithEntriesForRecipe(context.user.id, data.recipeId));

export const addRecipeToCalendarDay = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(addEntryToCalendarSchema)
  .handler(async ({ data, context }) => {
    const recipe = await findRecipeById(data.recipeId, context.user.id);
    if (!recipe) throw notFound();
    const entry = await addEntryToCalendar(
      data.calendarId,
      data.recipeId,
      data.dayOfWeek,
      context.user.id,
      context.user.isAdmin,
    );
    if (!entry) throw notFound();
    return entry;
  });

export const removeRecipeFromCalendarDay = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(removeEntryFromCalendarSchema)
  .handler(async ({ data, context }) => {
    const removed = await removeEntryFromCalendar(
      data.calendarId,
      data.entryId,
      context.user.id,
      context.user.isAdmin,
    );
    if (!removed) throw notFound();
    return removed;
  });

export const moveCalendarEntry = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(moveEntryInCalendarSchema)
  .handler(async ({ data, context }) => {
    const result = await moveEntryInCalendar(
      data.calendarId,
      data.entryId,
      data.direction,
      context.user.id,
      context.user.isAdmin,
    );
    if (!result) throw notFound();
    return result;
  });
