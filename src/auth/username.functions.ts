import { createServerFn } from "@tanstack/react-start";
import {
  updateAvatarOverrideSchema,
  updateNameSchema,
  updateUsernameSchema,
  updateVisibilityDefaultsSchema,
} from "./schemas";
import {
  updateUserAvatarOverride,
  updateUserName,
  updateUserUsername,
  updateUserVisibilityDefaults,
} from "./users.server";
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

export const updateName = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(updateNameSchema)
  .handler(async ({ data, context }) => {
    const [updated] = await updateUserName(context.user.id, data.name);
    return updated;
  });

export const updateAvatarOverride = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(updateAvatarOverrideSchema)
  .handler(async ({ data, context }) => {
    const [updated] = await updateUserAvatarOverride(context.user.id, data.avatarOverrideUrl);
    return updated;
  });
