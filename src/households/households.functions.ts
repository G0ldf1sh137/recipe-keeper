import { createServerFn } from "@tanstack/react-start";
import { requireAuthMiddleware } from "#/auth/auth-middleware";
import { listAllUsernames } from "#/auth/users.server";
import {
  createHouseholdSchema,
  inviteToHouseholdSchema,
  respondToInviteSchema,
  removeMemberSchema,
  leaveHouseholdSchema,
  transferOwnershipSchema,
} from "./schemas";
import {
  getMyHousehold,
  createHousehold as createHouseholdDb,
  inviteToHousehold as inviteToHouseholdDb,
  listMyInvites,
  respondToInvite as respondToInviteDb,
  removeMember as removeMemberDb,
  leaveHousehold as leaveHouseholdDb,
  transferOwnership as transferOwnershipDb,
} from "./households.server";

export const getMyHouseholdInfo = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => getMyHousehold(context.user.id));

export const getMyInvites = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => listMyInvites(context.user.id));

export const createHousehold = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(createHouseholdSchema)
  .handler(async ({ data, context }) => createHouseholdDb(context.user.id, data.name));

export const inviteToHousehold = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(inviteToHouseholdSchema)
  .handler(async ({ data, context }) => {
    await inviteToHouseholdDb(data.householdId, context.user.id, data.username);
    return { ok: true };
  });

export const respondToInvite = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(respondToInviteSchema)
  .handler(async ({ data, context }) => {
    await respondToInviteDb(data.inviteId, context.user.id, data.accept);
    return { ok: true };
  });

export const removeMember = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(removeMemberSchema)
  .handler(async ({ data, context }) => {
    await removeMemberDb(data.householdId, context.user.id, data.memberUserId);
    return { ok: true };
  });

export const leaveHousehold = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(leaveHouseholdSchema)
  .handler(async ({ data, context }) => {
    await leaveHouseholdDb(data.householdId, context.user.id);
    return { ok: true };
  });

export const transferOwnership = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(transferOwnershipSchema)
  .handler(async ({ data, context }) => {
    await transferOwnershipDb(data.householdId, context.user.id, data.newOwnerId);
    return { ok: true };
  });

export const getKnownUsernames = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async () => listAllUsernames());
