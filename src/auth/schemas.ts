import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/, "Use 3-30 lowercase letters, numbers, or hyphens.");

export const updateUsernameSchema = z.object({
  username: usernameSchema,
});

export const setUserAdminSchema = z.object({
  userId: z.string(),
  isAdmin: z.boolean(),
});

export const setUserIsSubscriberSchema = z.object({
  userId: z.string(),
  isSubscriber: z.boolean(),
});

export const startImpersonationSchema = z.object({
  userId: z.string().min(1),
});

export const searchUsersSchema = z.object({
  q: z.string().trim().min(1),
});

export const deleteUserSchema = z.object({
  userId: z.string().min(1),
});
