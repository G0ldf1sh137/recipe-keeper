import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { createCommentSchema, listCommentsSchema, deleteCommentSchema } from "./schemas";
import { findCommentById, findCommentTreeForRecipe, insertComment, deleteCommentById } from "./comments.server";
import { findRecipeById } from "#/recipes/recipes.server";
import { insertNotification } from "#/notifications/notifications.server";
import { sessionMiddleware, requireAuthMiddleware, requireAdminMiddleware } from "#/auth/auth-middleware";

export const listComments = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .validator(listCommentsSchema)
  .handler(async ({ data, context }) => {
    const recipe = await findRecipeById(data.recipeId, context.user?.id, data.shareToken, context.user?.isAdmin);
    if (!recipe) throw notFound();
    return findCommentTreeForRecipe(data.recipeId);
  });

export const createComment = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(createCommentSchema)
  .handler(async ({ data, context }) => {
    const recipe = await findRecipeById(data.recipeId, context.user.id, undefined, context.user.isAdmin);
    if (!recipe) throw notFound();

    if (data.parentId) {
      const parent = await findCommentById(data.parentId);
      if (!parent || parent.recipeId !== data.recipeId) throw notFound();
    }

    const comment = await insertComment(data, context.user.id);
    await insertNotification({
      recipientId: recipe.ownerId,
      actorId: context.user.id,
      recipeId: data.recipeId,
      type: "comment",
    });
    return comment;
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator(deleteCommentSchema)
  .handler(async ({ data }) => {
    const deleted = await deleteCommentById(data.commentId);
    if (!deleted) throw notFound();
    return deleted;
  });
