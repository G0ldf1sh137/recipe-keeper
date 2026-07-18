import { z } from "zod";

export const toggleFollowSchema = z.object({
  userId: z.string().min(1),
});

export const listByUsernameSchema = z.object({
  username: z.string().min(1),
});
