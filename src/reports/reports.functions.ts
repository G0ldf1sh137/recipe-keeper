import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { reportRecipeSchema, reportCommentSchema, reportMessageSchema, resolveReportSchema } from "./schemas";
import { insertReport, findOpenReports, resolveReportStatus } from "./reports.server";
import { findRecipeById } from "#/recipes/recipes.server";
import { findCommentById } from "#/comments/comments.server";
import { findMessageById, findConversationForParticipant } from "#/messages/messages.server";
import { requireAuthMiddleware, requireAdminMiddleware } from "#/auth/auth-middleware";

export const reportRecipe = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(reportRecipeSchema)
  .handler(async ({ data, context }) => {
    const recipe = await findRecipeById(data.recipeId, context.user.id, undefined, context.user.isAdmin);
    if (!recipe) throw notFound();
    if (recipe.ownerId === context.user.id) {
      throw new Error("You can't report your own recipe.");
    }
    return insertReport({ reporterId: context.user.id, recipeId: data.recipeId, reason: data.reason });
  });

export const reportComment = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(reportCommentSchema)
  .handler(async ({ data, context }) => {
    const comment = await findCommentById(data.commentId);
    if (!comment) throw notFound();
    if (comment.authorId === context.user.id) {
      throw new Error("You can't report your own comment.");
    }
    return insertReport({ reporterId: context.user.id, commentId: data.commentId, reason: data.reason });
  });

export const reportMessage = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(reportMessageSchema)
  .handler(async ({ data, context }) => {
    const message = await findMessageById(data.messageId);
    if (!message) throw notFound();
    if (message.senderId === context.user.id) {
      throw new Error("You can't report your own message.");
    }
    const conversation = await findConversationForParticipant(message.conversationId, context.user.id);
    if (!conversation) throw notFound();
    return insertReport({ reporterId: context.user.id, messageId: data.messageId, reason: data.reason });
  });

export const listOpenReports = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => findOpenReports());

export const resolveReport = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator(resolveReportSchema)
  .handler(async ({ data, context }) => {
    const updated = await resolveReportStatus(data.reportId, context.user.id);
    if (!updated) throw notFound();
    return updated;
  });
