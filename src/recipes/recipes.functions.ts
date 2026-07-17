import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import {
  createRecipeSchema,
  deleteRecipeSchema,
  forkRecipeSchema,
  getRecipeSchema,
  getRelatedRecipesSchema,
  listRecipesSchema,
  recipeShareSchema,
  updateRecipeSchema,
} from "./schemas";
import {
  createShareForRecipe,
  deleteOwnedRecipe,
  findForksOfRecipe,
  findRandomRecipeId,
  findRecipeById,
  findRecipes,
  findShareTokenForRecipe,
  findSimilarRecipes,
  forkRecipe as forkRecipeDb,
  insertRecipe,
  listIngredientNames,
  listUnitNames,
  listTagNames,
  findTagCounts,
  revokeShareForRecipe,
  updateOwnedRecipe,
} from "./recipes.server";
import { insertNotification } from "#/notifications/notifications.server";
import { sessionMiddleware, requireAuthMiddleware } from "#/auth/auth-middleware";

export const listRecipes = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .validator(listRecipesSchema)
  .handler(async ({ data, context }) => findRecipes(data, context.user?.id));

export const getRandomRecipeId = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .validator(listRecipesSchema)
  .handler(async ({ data, context }) => findRandomRecipeId(data, context.user?.id));

export const getRecipe = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .validator(getRecipeSchema)
  .handler(async ({ data, context }) => {
    const isAdmin = context.user?.isAdmin ?? false;
    const recipe = await findRecipeById(data.id, context.user?.id, data.shareToken, isAdmin);
    if (!recipe) throw notFound();
    const isOwner = recipe.ownerId === context.user?.id;
    const canEdit = isOwner || isAdmin;
    const shareToken = isOwner ? await findShareTokenForRecipe(recipe.id, context.user!.id) : null;
    const forkedFrom = recipe.parentRecipeId
      ? (await findRecipeById(recipe.parentRecipeId, context.user?.id)) ?? null
      : null;
    return {
      ...recipe,
      isOwner,
      canEdit,
      shareUrl: shareToken ? `/shared/${shareToken}` : null,
      forkedFrom,
    };
  });

export const getRelatedRecipes = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .validator(getRelatedRecipesSchema)
  .handler(async ({ data, context }) => {
    const [forks, similarRecipes] = await Promise.all([
      findForksOfRecipe(data.recipeId, context.user?.id),
      findSimilarRecipes(data.tags, data.ingredientNames, data.recipeId, context.user?.id),
    ]);
    return { forks, similarRecipes };
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

export const forkRecipe = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(forkRecipeSchema)
  .handler(async ({ data, context }) => {
    const result = await forkRecipeDb(data.recipeId, context.user.id, data.shareToken);
    if (!result) throw notFound();
    await insertNotification({
      recipientId: result.originalOwnerId,
      actorId: context.user.id,
      recipeId: data.recipeId,
      type: "fork",
    });
    return result.forked;
  });

export const getIngredientNames = createServerFn({ method: "GET" }).handler(async () => listIngredientNames());

export const getUnitNames = createServerFn({ method: "GET" }).handler(async () => listUnitNames());

export const getTagNames = createServerFn({ method: "GET" }).handler(async () => listTagNames());

export const getTagCounts = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .handler(async ({ context }) => findTagCounts(context.user?.id));

export const createRecipe = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(createRecipeSchema)
  .handler(async ({ data, context }) => insertRecipe(data, context.user.id));

export const updateRecipe = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(updateRecipeSchema)
  .handler(async ({ data, context }) => {
    const recipe = await updateOwnedRecipe(data, context.user.id, context.user.isAdmin);
    if (!recipe) throw notFound();
    return recipe;
  });

export const deleteRecipe = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(deleteRecipeSchema)
  .handler(async ({ data, context }) => {
    const recipe = await deleteOwnedRecipe(data, context.user.id, context.user.isAdmin);
    if (!recipe) throw notFound();
    return recipe;
  });
