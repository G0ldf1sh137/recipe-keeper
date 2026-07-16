import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])?$/, "Use 3-30 lowercase letters, numbers, or hyphens.");

export const updateUsernameSchema = z.object({
  username: usernameSchema,
});
