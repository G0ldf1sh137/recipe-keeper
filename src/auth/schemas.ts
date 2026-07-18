import { z } from "zod";
import { visibilityValues } from "#/db/schema";

const visibilitySchema = z.enum(visibilityValues);

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

export const updateVisibilityDefaultsSchema = z.object({
  defaultRecipeVisibility: visibilitySchema,
  defaultCollectionVisibility: visibilitySchema,
});

export const updateNameSchema = z.object({
  name: z.string().trim().min(1, "Name can't be empty.").max(100),
});

export const updateAvatarOverrideSchema = z.object({
  avatarOverrideUrl: z.string().url().nullable(),
});

export const devLoginSchema = z.object({
  username: z.string().trim().min(1),
});
