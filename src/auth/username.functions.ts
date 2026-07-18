import { createServerFn } from "@tanstack/react-start";
import {
  updateAvatarOverrideSchema,
  updateNameSchema,
  updateUsernameSchema,
  updateVisibilityDefaultsSchema,
  updateWeekStartDaySchema,
} from "./schemas";
import {
  updateUserAvatarOverride,
  updateUserName,
  updateUserUsername,
  updateUserVisibilityDefaults,
  updateUserWeekStartDay,
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

export const updateWeekStartDay = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(updateWeekStartDaySchema)
  .handler(async ({ data, context }) => {
    const [updated] = await updateUserWeekStartDay(context.user.id, data.weekStartDay);
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
