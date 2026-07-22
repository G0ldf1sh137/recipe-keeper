import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { requireSubscriberMiddleware } from "#/auth/auth-middleware";
import { getMyHousehold } from "#/households/households.server";
import { findCalendarById } from "#/calendars/calendars.server";
import { findRecipeById } from "#/recipes/recipes.server";
import { insertNotification } from "#/notifications/notifications.server";
import {
  createPollSchema,
  getPollSchema,
  addPollOptionSchema,
  voteOnPollSchema,
  closePollSchema,
  deletePollSchema,
  pollsForRecipeSchema,
} from "./schemas";
import {
  findPollsForHousehold,
  findPollById,
  findOpenPollsWithOptionStatusForRecipe,
  insertPoll,
  addPollOption as addPollOptionDb,
  upsertPollVote,
  closePoll as closePollDb,
  deletePoll as deletePollDb,
} from "./polls.server";

export const listMyHouseholdPolls = createServerFn({ method: "GET" })
  .middleware([requireSubscriberMiddleware])
  .handler(async ({ context }) => {
    const household = await getMyHousehold(context.user.id);
    if (!household) return [];
    return findPollsForHousehold(household.id);
  });

export const getPollsForRecipe = createServerFn({ method: "GET" })
  .middleware([requireSubscriberMiddleware])
  .validator(pollsForRecipeSchema)
  .handler(async ({ data, context }) => {
    const household = await getMyHousehold(context.user.id);
    if (!household) return [];
    return findOpenPollsWithOptionStatusForRecipe(household.id, data.recipeId);
  });

export const getPoll = createServerFn({ method: "GET" })
  .middleware([requireSubscriberMiddleware])
  .validator(getPollSchema)
  .handler(async ({ data, context }) => {
    const poll = await findPollById(data.id);
    if (!poll) throw notFound();
    const household = await getMyHousehold(context.user.id);
    if (!household || household.id !== poll.householdId) throw notFound();

    const yourVoteOptionId =
      poll.options.find((option) => option.voters.some((voter) => voter.id === context.user.id))?.id ?? null;

    return { poll, isCreator: poll.createdBy === context.user.id, yourVoteOptionId };
  });

export const createPoll = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
  .validator(createPollSchema)
  .handler(async ({ data, context }) => {
    const household = await getMyHousehold(context.user.id);
    if (!household) throw new Error("You need to be in a household to create a Dinner Poll.");

    if (data.targetCalendarId) {
      const calendar = await findCalendarById(data.targetCalendarId, context.user.id, context.user.isAdmin);
      if (!calendar) throw new Error("That Meal Week wasn't found.");
    }

    const poll = await insertPoll(
      household.id,
      context.user.id,
      data.title,
      data.targetDate,
      data.targetCalendarId ?? null,
    );

    await Promise.all(
      household.members
        .filter((member) => member.id !== context.user.id)
        .map((member) =>
          insertNotification({
            recipientId: member.id,
            actorId: context.user.id,
            recipeId: null,
            pollId: poll.id,
            type: "pollCreated",
          }),
        ),
    );

    return poll;
  });

export const addPollOption = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
  .validator(addPollOptionSchema)
  .handler(async ({ data, context }) => {
    const household = await getMyHousehold(context.user.id);
    if (!household) throw notFound();
    const recipe = await findRecipeById(data.recipeId, context.user.id);
    if (!recipe) throw notFound();
    const option = await addPollOptionDb(data.pollId, data.recipeId, context.user.id, household.id);
    if (!option) throw notFound();
    return option;
  });

export const voteOnPoll = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
  .validator(voteOnPollSchema)
  .handler(async ({ data, context }) => {
    const household = await getMyHousehold(context.user.id);
    if (!household) throw notFound();
    await upsertPollVote(data.pollId, context.user.id, data.optionId, household.id);
    return { ok: true };
  });

export const closePoll = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
  .validator(closePollSchema)
  .handler(async ({ data, context }) => {
    const { poll, winnerOptionIds } = await closePollDb(data.pollId, context.user.id);

    if (winnerOptionIds.length === 1) {
      const household = await getMyHousehold(context.user.id);
      await Promise.all(
        (household?.members ?? [])
          .filter((member) => member.id !== context.user.id)
          .map((member) =>
            insertNotification({
              recipientId: member.id,
              actorId: context.user.id,
              recipeId: null,
              pollId: poll.id,
              type: "pollClosed",
            }),
          ),
      );
    }

    return { poll, winnerOptionIds };
  });

export const deletePoll = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
  .validator(deletePollSchema)
  .handler(async ({ data, context }) => {
    const deleted = await deletePollDb(data.id, context.user.id, context.user.isAdmin);
    if (!deleted) throw notFound();
    return deleted;
  });
