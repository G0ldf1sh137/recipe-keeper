import { z } from "zod";

export const startConversationSchema = z.object({
  userId: z.string().min(1),
});

export const getConversationSchema = z.object({
  id: z.string().min(1),
});

export const sendMessageSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1).max(4000),
});

export const deleteMessageSchema = z.object({
  messageId: z.string().min(1),
});

export const updateMessagingPreferencesSchema = z.object({
  restrictMessagesToFollowing: z.boolean(),
});
