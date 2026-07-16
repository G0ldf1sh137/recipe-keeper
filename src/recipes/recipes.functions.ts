import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import {
  createRecipeSchema,
  deleteRecipeSchema,
  getRecipeSchema,
  listRecipesSchema,
  recipeShareSchema,
  updateRecipeSchema,
} from "./schemas";
import {
  createShareForRecipe,
  deleteOwnedRecipe,
  findRecipeById,
  findRecipes,
  findShareTokenForRecipe,
  insertRecipe,
  revokeShareForRecipe,
  updateOwnedRecipe,
} from "./recipes.server";
import { sessionMiddleware, requireAuthMiddleware } from "#/auth/auth-middleware";

export const listRecipes = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .validator(listRecipesSchema)
  .handler(async ({ data, context }) => findRecipes(data, context.user?.id));

export const getRecipe = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .validator(getRecipeSchema)
  .handler(async ({ data, context }) => {
    const recipe = await findRecipeById(data.id, context.user?.id, data.shareToken);
    if (!recipe) throw notFound();
    const isOwner = recipe.ownerId === context.user?.id;
    const shareToken = isOwner ? await findShareTokenForRecipe(recipe.id, context.user!.id) : null;
    return {
      ...recipe,
      isOwner,
      shareUrl: shareToken ? `/shared/${shareToken}` : null,
    };
  });

export const createRecipeShare = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(recipeShareSchema)
  .handler(async ({ data, context }) => {
    const token = await createShareForRecipe(data.recipeId, context.user.id);
    if (token === undefined) throw notFound();
    return { shareUrl: `/shared/${token}` };
  });

export const revokeRecipeShare = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(recipeShareSchema)
  .handler(async ({ data, context }) => {
    const result = await revokeShareForRecipe(data.recipeId, context.user.id);
    if (result === undefined) throw notFound();
    return { ok: true };
  });

export const createRecipe = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(createRecipeSchema)
  .handler(async ({ data, context }) => insertRecipe(data, context.user.id));

export const updateRecipe = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(updateRecipeSchema)
  .handler(async ({ data, context }) => {
    const recipe = await updateOwnedRecipe(data, context.user.id);
    if (!recipe) throw notFound();
    return recipe;
  });

export const deleteRecipe = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(deleteRecipeSchema)
  .handler(async ({ data, context }) => {
    const recipe = await deleteOwnedRecipe(data, context.user.id);
    if (!recipe) throw notFound();
    return recipe;
  });
