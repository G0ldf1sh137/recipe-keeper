import { and, eq, ne, or, sql } from "drizzle-orm";
import { db } from "#/db/index";
import { calendars, calendarEntries, recipes, shares } from "#/db/schema";
import type { DayOfWeek, Visibility } from "#/db/schema";

export async function findCalendarsByOwner(ownerId: string) {
  return db
    .select({
      id: calendars.id,
      name: calendars.name,
      createdAt: calendars.createdAt,
      entryCount: sql<number>`count(${calendarEntries.id})::int`,
    })
    .from(calendars)
    .leftJoin(calendarEntries, eq(calendarEntries.calendarId, calendars.id))
    .where(eq(calendars.ownerId, ownerId))
    .groupBy(calendars.id)
    .orderBy(calendars.createdAt);
}

export async function findCalendarById(id: string, ownerId: string) {
  return db.query.calendars.findFirst({
    where: and(eq(calendars.id, id), eq(calendars.ownerId, ownerId)),
  });
}

// A calendar is visible to a viewer if it's public, the viewer owns it, or
// they hold a valid share token. "unlisted" calendars are only reachable
// via a share token, mirroring collections' findCollectionForViewer.
export async function findCalendarForViewer(id: string, viewerId: string | undefined, shareToken?: string) {
  const visible = viewerId
    ? or(eq(calendars.visibility, "public"), eq(calendars.ownerId, viewerId))
    : eq(calendars.visibility, "public");
  const calendar = await db.query.calendars.findFirst({
    where: and(eq(calendars.id, id), visible),
  });
  if (calendar) return calendar;
  if (!shareToken) return undefined;

  const share = await db.query.shares.findFirst({
    where: and(eq(shares.token, shareToken), eq(shares.calendarId, id)),
  });
  if (!share) return undefined;
  return db.query.calendars.findFirst({
    where: and(eq(calendars.id, id), ne(calendars.visibility, "private")),
  });
}

export async function findEntriesForCalendar(calendarId: string) {
  return db
    .select({
      entryId: calendarEntries.id,
      dayOfWeek: calendarEntries.dayOfWeek,
      recipeId: recipes.id,
      title: recipes.title,
      photoUrls: recipes.photoUrls,
      coverPhotoUrl: recipes.coverPhotoUrl,
      visibility: recipes.visibility,
      createdAt: calendarEntries.createdAt,
    })
    .from(calendarEntries)
    .innerJoin(recipes, eq(calendarEntries.recipeId, recipes.id))
    .where(eq(calendarEntries.calendarId, calendarId))
    .orderBy(calendarEntries.createdAt);
}

export async function insertCalendar(name: string, ownerId: string) {
  const [calendar] = await db.insert(calendars).values({ name, ownerId }).returning();
  return calendar;
}

export async function renameOwnedCalendar(id: string, ownerId: string, name: string) {
  const rows = await db
    .update(calendars)
    .set({ name })
    .where(and(eq(calendars.id, id), eq(calendars.ownerId, ownerId)))
    .returning();
  return rows.at(0);
}

export async function deleteOwnedCalendar(id: string, ownerId: string) {
  const rows = await db
    .delete(calendars)
    .where(and(eq(calendars.id, id), eq(calendars.ownerId, ownerId)))
    .returning();
  return rows.at(0);
}

export async function findCalendarsWithEntriesForRecipe(ownerId: string, recipeId: string) {
  const rows = await db
    .select({
      calendarId: calendars.id,
      calendarName: calendars.name,
      entryId: calendarEntries.id,
      dayOfWeek: calendarEntries.dayOfWeek,
    })
    .from(calendars)
    .leftJoin(
      calendarEntries,
      and(eq(calendarEntries.calendarId, calendars.id), eq(calendarEntries.recipeId, recipeId)),
    )
    .where(eq(calendars.ownerId, ownerId))
    .orderBy(calendars.createdAt);

  const byCalendar = new Map<
    string,
    { id: string; name: string; entries: { entryId: string; dayOfWeek: DayOfWeek }[] }
  >();
  for (const row of rows) {
    const existing = byCalendar.get(row.calendarId) ?? { id: row.calendarId, name: row.calendarName, entries: [] };
    if (row.entryId && row.dayOfWeek) existing.entries.push({ entryId: row.entryId, dayOfWeek: row.dayOfWeek });
    byCalendar.set(row.calendarId, existing);
  }
  return Array.from(byCalendar.values());
}

export async function addEntryToCalendar(
  calendarId: string,
  recipeId: string,
  dayOfWeek: DayOfWeek,
  ownerId: string,
) {
  const calendar = await findCalendarById(calendarId, ownerId);
  if (!calendar) return undefined;
  const [entry] = await db.insert(calendarEntries).values({ calendarId, recipeId, dayOfWeek }).returning();
  return entry;
}

export async function removeEntryFromCalendar(calendarId: string, entryId: string, ownerId: string) {
  const calendar = await findCalendarById(calendarId, ownerId);
  if (!calendar) return undefined;
  const rows = await db
    .delete(calendarEntries)
    .where(and(eq(calendarEntries.id, entryId), eq(calendarEntries.calendarId, calendarId)))
    .returning();
  return rows.at(0);
}

export async function updateCalendarVisibility(id: string, ownerId: string, visibility: Visibility) {
  const rows = await db
    .update(calendars)
    .set({ visibility })
    .where(and(eq(calendars.id, id), eq(calendars.ownerId, ownerId)))
    .returning();
  return rows.at(0);
}

export async function findShareTokenForCalendar(calendarId: string, ownerId: string) {
  const calendar = await findCalendarById(calendarId, ownerId);
  if (!calendar) return undefined;
  const share = await db.query.shares.findFirst({ where: eq(shares.calendarId, calendarId) });
  return share?.token ?? null;
}

export async function createShareForCalendar(calendarId: string, ownerId: string) {
  const calendar = await findCalendarById(calendarId, ownerId);
  if (!calendar) return undefined;
  if (calendar.visibility === "private") {
    throw new Error("Set the calendar to unlisted or public before sharing it.");
  }

  const existing = await db.query.shares.findFirst({ where: eq(shares.calendarId, calendarId) });
  if (existing) return existing.token;

  const [share] = await db.insert(shares).values({ calendarId, createdBy: ownerId }).returning();
  return share.token;
}

export async function revokeShareForCalendar(calendarId: string, ownerId: string) {
  const calendar = await findCalendarById(calendarId, ownerId);
  if (!calendar) return undefined;
  await db.delete(shares).where(eq(shares.calendarId, calendarId));
  return true;
}
