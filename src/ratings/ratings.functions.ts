import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { rateRecipeSchema, getRatingSummarySchema, getRatingSummariesSchema } from "./schemas";
import { findRatingSummary, findRatingSummariesForRecipes, upsertRating } from "./ratings.server";
import { findRecipeById, filterVisibleRecipeIds } from "#/recipes/recipes.server";
import { sessionMiddleware, requireAuthMiddleware } from "#/auth/auth-middleware";

export const getRatingSummary = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .validator(getRatingSummarySchema)
  .handler(async ({ data, context }) => {
    const recipe = await findRecipeById(data.recipeId, context.user?.id);
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
    const recipe = await findRecipeById(data.recipeId, context.user.id);
    if (!recipe) throw notFound();
    await upsertRating(data.recipeId, context.user.id, data.value);
    return findRatingSummary(data.recipeId, context.user.id);
  });
