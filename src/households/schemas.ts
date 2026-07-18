import { z } from "zod";

export const createHouseholdSchema = z.object({
  name: z.string().trim().min(1),
});

export const inviteToHouseholdSchema = z.object({
  householdId: z.string(),
  username: z.string().trim().min(1),
});

export const respondToInviteSchema = z.object({
  inviteId: z.string(),
  accept: z.boolean(),
});

export const removeMemberSchema = z.object({
  householdId: z.string(),
  memberUserId: z.string(),
});

export const leaveHouseholdSchema = z.object({
  householdId: z.string(),
});

export const transferOwnershipSchema = z.object({
  householdId: z.string(),
  newOwnerId: z.string(),
});
