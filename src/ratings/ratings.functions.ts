import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { rateRecipeSchema, getRatingSummarySchema, getRatingSummariesSchema } from "./schemas";
import { findRatingSummary, findRatingSummariesForRecipes, hasRated, upsertRating } from "./ratings.server";
import { findRecipeById, filterVisibleRecipeIds } from "#/recipes/recipes.server";
import { insertNotification } from "#/notifications/notifications.server";
import { sessionMiddleware, requireAuthMiddleware } from "#/auth/auth-middleware";

export const getRatingSummary = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .validator(getRatingSummarySchema)
  .handler(async ({ data, context }) => {
    const recipe = await findRecipeById(data.recipeId, context.user?.id, data.shareToken, context.user?.isAdmin);
    if (!recipe) throw notFound();
    return findRatingSummary(data.recipeId, context.user?.id);
  });

export const getRatingSummaries = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .validator(getRatingSummariesSchema)
  .handler(async ({ data, context }) => {
    const visibleIds = await filterVisibleRecipeIds(data.recipeIds, context.user?.id);
    return findRatingSummariesForRecipes(visibleIds);
  });

export const rateRecipe = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(rateRecipeSchema)
  .handler(async ({ data, context }) => {
    const recipe = await findRecipeById(data.recipeId, context.user.id, undefined, context.user.isAdmin);
    if (!recipe) throw notFound();
    const isFirstRating = !(await hasRated(data.recipeId, context.user.id));
    await upsertRating(data.recipeId, context.user.id, data.value);
    if (isFirstRating) {
      await insertNotification({
        recipientId: recipe.ownerId,
        actorId: context.user.id,
        recipeId: data.recipeId,
        type: "rating",
      });
    }
    return findRatingSummary(data.recipeId, context.user.id);
  });
