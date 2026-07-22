import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "#/db/index";
import { polls, pollOptions, pollVotes, recipes, users } from "#/db/schema";
import { addEntryToCalendar } from "#/calendars/calendars.server";
import type { PollStatus, DayOfWeek } from "#/db/schema";

export type PollSummary = {
  id: string;
  title: string;
  targetDate: Date;
  status: PollStatus;
  createdBy: string;
  targetCalendarId: string | null;
  optionCount: number;
  voteCount: number;
  winningRecipeTitle: string | null;
};

export async function findPollsForHousehold(householdId: string): Promise<PollSummary[]> {
  const rows = await db
    .select({
      id: polls.id,
      title: polls.title,
      targetDate: polls.targetDate,
      status: polls.status,
      createdBy: polls.createdBy,
      targetCalendarId: polls.targetCalendarId,
      winningOptionId: polls.winningOptionId,
      optionCount: sql<number>`count(distinct ${pollOptions.id})::int`,
      voteCount: sql<number>`count(distinct ${pollVotes.userId})::int`,
    })
    .from(polls)
    .leftJoin(pollOptions, eq(pollOptions.pollId, polls.id))
    .leftJoin(pollVotes, eq(pollVotes.pollId, polls.id))
    .where(eq(polls.householdId, householdId))
    .groupBy(polls.id)
    .orderBy(sql`case when ${polls.status} = 'open' then 0 else 1 end`, desc(polls.createdAt));

  const winningOptionIds = rows.map((r) => r.winningOptionId).filter((id): id is string => !!id);
  const winnerTitles = winningOptionIds.length
    ? await db
        .select({ optionId: pollOptions.id, title: recipes.title })
        .from(pollOptions)
        .innerJoin(recipes, eq(pollOptions.recipeId, recipes.id))
        .where(inArray(pollOptions.id, winningOptionIds))
    : [];
  const titleByOptionId = new Map(winnerTitles.map((w) => [w.optionId, w.title]));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    targetDate: row.targetDate,
    status: row.status,
    createdBy: row.createdBy,
    targetCalendarId: row.targetCalendarId,
    optionCount: row.optionCount,
    voteCount: row.voteCount,
    winningRecipeTitle: row.winningOptionId ? (titleByOptionId.get(row.winningOptionId) ?? null) : null,
  }));
}

export type PollWithOptionStatus = {
  id: string;
  title: string;
  targetDate: Date;
  hasOption: boolean;
};

export async function findOpenPollsWithOptionStatusForRecipe(
  householdId: string,
  recipeId: string,
): Promise<PollWithOptionStatus[]> {
  const rows = await db
    .select({
      id: polls.id,
      title: polls.title,
      targetDate: polls.targetDate,
      optionId: pollOptions.id,
    })
    .from(polls)
    .leftJoin(pollOptions, and(eq(pollOptions.pollId, polls.id), eq(pollOptions.recipeId, recipeId)))
    .where(and(eq(polls.householdId, householdId), eq(polls.status, "open")))
    .orderBy(polls.targetDate);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    targetDate: row.targetDate,
    hasOption: !!row.optionId,
  }));
}

export type PollOptionDetail = {
  id: string;
  recipeId: string;
  addedBy: string;
  recipe: {
    id: string;
    title: string;
    visibility: string;
    tags: string[];
    photoUrls: string[];
    coverPhotoUrl: string | null;
  };
  voteCount: number;
  voters: { id: string; name: string }[];
};

export type PollDetail = {
  id: string;
  householdId: string;
  createdBy: string;
  title: string;
  targetDate: Date;
  targetCalendarId: string | null;
  status: PollStatus;
  winningOptionId: string | null;
  closedAt: Date | null;
  options: PollOptionDetail[];
};

export async function findPollById(pollId: string): Promise<PollDetail | undefined> {
  const poll = await db.query.polls.findFirst({ where: eq(polls.id, pollId) });
  if (!poll) return undefined;

  const optionRows = await db
    .select({
      id: pollOptions.id,
      recipeId: recipes.id,
      addedBy: pollOptions.addedBy,
      title: recipes.title,
      visibility: recipes.visibility,
      tags: recipes.tags,
      photoUrls: recipes.photoUrls,
      coverPhotoUrl: recipes.coverPhotoUrl,
    })
    .from(pollOptions)
    .innerJoin(recipes, eq(pollOptions.recipeId, recipes.id))
    .where(eq(pollOptions.pollId, pollId))
    .orderBy(pollOptions.createdAt);

  const voteRows = await db
    .select({ optionId: pollVotes.optionId, userId: users.id, name: users.name })
    .from(pollVotes)
    .innerJoin(users, eq(pollVotes.userId, users.id))
    .where(eq(pollVotes.pollId, pollId));

  const votersByOption = new Map<string, { id: string; name: string }[]>();
  for (const row of voteRows) {
    const list = votersByOption.get(row.optionId) ?? [];
    list.push({ id: row.userId, name: row.name });
    votersByOption.set(row.optionId, list);
  }

  return {
    id: poll.id,
    householdId: poll.householdId,
    createdBy: poll.createdBy,
    title: poll.title,
    targetDate: poll.targetDate,
    targetCalendarId: poll.targetCalendarId,
    status: poll.status,
    winningOptionId: poll.winningOptionId,
    closedAt: poll.closedAt,
    options: optionRows.map((row) => ({
      id: row.id,
      recipeId: row.recipeId,
      addedBy: row.addedBy,
      recipe: {
        id: row.recipeId,
        title: row.title,
        visibility: row.visibility,
        tags: row.tags,
        photoUrls: row.photoUrls,
        coverPhotoUrl: row.coverPhotoUrl,
      },
      voters: votersByOption.get(row.id) ?? [],
      voteCount: (votersByOption.get(row.id) ?? []).length,
    })),
  };
}

export async function insertPoll(
  householdId: string,
  createdBy: string,
  title: string,
  targetDate: Date,
  targetCalendarId: string | null,
) {
  const [poll] = await db
    .insert(polls)
    .values({ householdId, createdBy, title, targetDate, targetCalendarId })
    .returning();
  return poll;
}

export async function addPollOption(
  pollId: string,
  recipeId: string,
  addedBy: string,
  requesterHouseholdId: string,
) {
  const poll = await db.query.polls.findFirst({ where: eq(polls.id, pollId) });
  if (!poll || poll.householdId !== requesterHouseholdId) return undefined;
  if (poll.status !== "open") throw new Error("This poll is closed.");

  const existing = await db.query.pollOptions.findFirst({
    where: and(eq(pollOptions.pollId, pollId), eq(pollOptions.recipeId, recipeId)),
  });
  if (existing) throw new Error("That recipe is already an option in this poll.");

  const [option] = await db.insert(pollOptions).values({ pollId, recipeId, addedBy }).returning();
  return option;
}

export async function upsertPollVote(
  pollId: string,
  userId: string,
  optionId: string,
  requesterHouseholdId: string,
) {
  const poll = await db.query.polls.findFirst({ where: eq(polls.id, pollId) });
  if (!poll || poll.householdId !== requesterHouseholdId) throw new Error("Poll not found.");
  if (poll.status !== "open") throw new Error("This poll is closed.");

  const option = await db.query.pollOptions.findFirst({
    where: and(eq(pollOptions.id, optionId), eq(pollOptions.pollId, pollId)),
  });
  if (!option) throw new Error("That option isn't part of this poll.");

  await db
    .insert(pollVotes)
    .values({ pollId, userId, optionId })
    .onConflictDoUpdate({
      target: [pollVotes.pollId, pollVotes.userId],
      set: { optionId, updatedAt: new Date() },
    });
}

// Maps a target date to this app's dayOfWeekValues enum. Uses UTC getters
// deliberately — targetDate represents a calendar date with no meaningful
// time-of-day component, and reading it with local-timezone getters would
// shift the day backward/forward depending on the server's timezone.
function dateToDayOfWeek(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  return days[date.getUTCDay()];
}

export async function closePoll(pollId: string, requesterId: string) {
  const { poll, winnerOptionIds } = await db.transaction(async (tx) => {
    const existingPoll = await tx.query.polls.findFirst({ where: eq(polls.id, pollId) });
    if (!existingPoll) throw new Error("Poll not found.");
    if (existingPoll.createdBy !== requesterId) throw new Error("Only the poll creator can close this poll.");
    if (existingPoll.status !== "open") throw new Error("This poll is already closed.");

    const tallies = await tx
      .select({ optionId: pollVotes.optionId, count: sql<number>`count(*)::int` })
      .from(pollVotes)
      .where(eq(pollVotes.pollId, pollId))
      .groupBy(pollVotes.optionId);

    if (tallies.length === 0) {
      const [closed] = await tx
        .update(polls)
        .set({ status: "closed", closedAt: new Date(), winningOptionId: null })
        .where(eq(polls.id, pollId))
        .returning();
      return { poll: closed, winnerOptionIds: [] as string[] };
    }

    const maxCount = Math.max(...tallies.map((t) => t.count));
    const topOptionIds = tallies.filter((t) => t.count === maxCount).map((t) => t.optionId);

    const [closed] = await tx
      .update(polls)
      .set({
        status: "closed",
        closedAt: new Date(),
        winningOptionId: topOptionIds.length === 1 ? topOptionIds[0] : null,
      })
      .where(eq(polls.id, pollId))
      .returning();

    return { poll: closed, winnerOptionIds: topOptionIds };
  });

  // Best-effort side effect, deliberately outside the transaction above: scheduling the
  // winning recipe into the creator's own Meal Week. If the target calendar was deleted
  // since the poll was created, addEntryToCalendar just returns undefined — the poll still
  // closes successfully either way.
  if (winnerOptionIds.length === 1 && poll.targetCalendarId) {
    const winningOption = await db.query.pollOptions.findFirst({ where: eq(pollOptions.id, winnerOptionIds[0]) });
    if (winningOption) {
      await addEntryToCalendar(
        poll.targetCalendarId,
        winningOption.recipeId,
        dateToDayOfWeek(poll.targetDate),
        poll.createdBy,
        false,
      );
    }
  }

  return { poll, winnerOptionIds };
}

export async function deletePoll(pollId: string, requesterId: string, isAdmin = false) {
  const scoped = isAdmin ? eq(polls.id, pollId) : and(eq(polls.id, pollId), eq(polls.createdBy, requesterId));
  const rows = await db.delete(polls).where(scoped).returning();
  return rows.at(0);
}
