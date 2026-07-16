import { createServerFn } from "@tanstack/react-start";
import { updateUsernameSchema } from "./schemas";
import { updateUserUsername } from "./users.server";
import { requireAuthMiddleware } from "./auth-middleware";

export const updateUsername = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(updateUsernameSchema)
  .handler(async ({ data, context }) => updateUserUsername(context.user.id, data.username));
