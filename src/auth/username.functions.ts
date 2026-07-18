import { createServerFn } from "@tanstack/react-start";
import { updateUsernameSchema, updateVisibilityDefaultsSchema } from "./schemas";
import { updateUserUsername, updateUserVisibilityDefaults } from "./users.server";
import { requireAuthMiddleware } from "./auth-middleware";

export const updateUsername = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(updateUsernameSchema)
  .handler(async ({ data, context }) => updateUserUsername(context.user.id, data.username));

export const updateVisibilityDefaults = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(updateVisibilityDefaultsSchema)
  .handler(async ({ data, context }) => {
    const [updated] = await updateUserVisibilityDefaults(context.user.id, data);
    return updated;
  });
