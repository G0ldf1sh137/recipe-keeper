import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { hideRecipeSchema } from "./schemas";
import { hideRecipe as hideRecipeDb, unhideRecipe as unhideRecipeDb } from "./hidden-recipes.server";
import { findRecipeById } from "#/recipes/recipes.server";
import { requireAuthMiddleware } from "#/auth/auth-middleware";

export const hideRecipe = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(hideRecipeSchema)
  .handler(async ({ data, context }) => {
    const recipe = await findRecipeById(data.recipeId, context.user.id, undefined, context.user.isAdmin);
    if (!recipe) throw notFound();
    await hideRecipeDb(context.user.id, data.recipeId);
    return { ok: true };
  });

export const unhideRecipe = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(hideRecipeSchema)
  .handler(async ({ data, context }) => {
    const recipe = await findRecipeById(data.recipeId, context.user.id, undefined, context.user.isAdmin);
    if (!recipe) throw notFound();
    await unhideRecipeDb(context.user.id, data.recipeId);
    return { ok: true };
  });
