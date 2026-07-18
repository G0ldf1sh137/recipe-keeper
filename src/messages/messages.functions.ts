import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import {
  startConversationSchema,
  getConversationSchema,
  sendMessageSchema,
  deleteMessageSchema,
  updateMessagingPreferencesSchema,
} from "./schemas";
import {
  findOrCreateConversation,
  findConversationForParticipant,
  findConversationsForUser,
  findMessagesForConversation,
  sendMessage as sendMessageDb,
  markConversationRead,
  countUnreadMessages,
  deleteMessageById,
} from "./messages.server";
import { findUserById, updateUserMessagingPreferences } from "#/auth/users.server";
import {
  sessionMiddleware,
  requireAuthMiddleware,
  requireModeratorMiddleware,
  requireNotBannedMiddleware,
} from "#/auth/auth-middleware";

export const startConversation = createServerFn({ method: "POST" })
  .middleware([requireNotBannedMiddleware])
  .validator(startConversationSchema)
  .handler(async ({ data, context }) => {
    const conversation = await findOrCreateConversation(context.user.id, data.userId);
    if (!conversation) throw notFound();
    return conversation;
  });

export const getConversation = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .validator(getConversationSchema)
  .handler(async ({ data, context }) => {
    const conversation = await findConversationForParticipant(data.id, context.user.id);
    if (!conversation) throw notFound();

    const otherUserId = conversation.user1Id === context.user.id ? conversation.user2Id : conversation.user1Id;
    const [otherUser, msgs] = await Promise.all([
      findUserById(otherUserId),
      findMessagesForConversation(conversation.id),
    ]);
    if (!otherUser) throw notFound();

    await markConversationRead(conversation.id, context.user.id);

    return {
      conversationId: conversation.id,
      otherUser: {
        id: otherUser.id,
        name: otherUser.name,
        username: otherUser.username,
        avatarUrl: otherUser.avatarOverrideUrl ?? otherUser.avatarUrl,
      },
      messages: msgs,
    };
  });

export const listConversations = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => findConversationsForUser(context.user.id));

export const sendMessage = createServerFn({ method: "POST" })
  .middleware([requireNotBannedMiddleware])
  .validator(sendMessageSchema)
  .handler(async ({ data, context }) => {
    const conversation = await findConversationForParticipant(data.conversationId, context.user.id);
    if (!conversation) throw notFound();
    return sendMessageDb(data.conversationId, context.user.id, data.body);
  });

export const getUnreadMessageCount = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .handler(async ({ context }) => {
    if (!context.user) return 0;
    return countUnreadMessages(context.user.id);
  });

export const deleteMessage = createServerFn({ method: "POST" })
  .middleware([requireModeratorMiddleware])
  .validator(deleteMessageSchema)
  .handler(async ({ data }) => {
    const deleted = await deleteMessageById(data.messageId);
    if (!deleted) throw notFound();
    return deleted;
  });

export const updateMessagingPreferences = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(updateMessagingPreferencesSchema)
  .handler(async ({ data, context }) => {
    const [updated] = await updateUserMessagingPreferences(context.user.id, data);
    return updated;
  });
