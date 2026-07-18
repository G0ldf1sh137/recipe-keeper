import { and, eq } from "drizzle-orm";
import { db } from "#/db/index";
import { households, householdMembers, householdInvites, users } from "#/db/schema";
import { findUserByUsername } from "#/auth/users.server";
import { insertNotification } from "#/notifications/notifications.server";

export type Household = {
  id: string;
  name: string;
  ownerId: string;
  members: { id: string; name: string; username: string | null }[];
};

export async function getMyHousehold(userId: string): Promise<Household | null> {
  const membership = await db.query.householdMembers.findFirst({
    where: eq(householdMembers.userId, userId),
  });
  if (!membership) return null;

  const household = await db.query.households.findFirst({
    where: eq(households.id, membership.householdId),
  });
  if (!household) return null;

  const memberRows = await db
    .select({ id: users.id, name: users.name, username: users.username })
    .from(householdMembers)
    .innerJoin(users, eq(householdMembers.userId, users.id))
    .where(eq(householdMembers.householdId, household.id))
    .orderBy(users.name);

  return { id: household.id, name: household.name, ownerId: household.ownerId, members: memberRows };
}

export async function createHousehold(ownerId: string, name: string): Promise<Household> {
  const existing = await db.query.householdMembers.findFirst({ where: eq(householdMembers.userId, ownerId) });
  if (existing) throw new Error("You're already in a household. Leave it first.");

  const [household] = await db.insert(households).values({ ownerId, name }).returning();
  await db.insert(householdMembers).values({ householdId: household.id, userId: ownerId });

  const created = await getMyHousehold(ownerId);
  if (!created) throw new Error("Failed to create household");
  return created;
}

export async function inviteToHousehold(householdId: string, inviterId: string, username: string) {
  const household = await db.query.households.findFirst({ where: eq(households.id, householdId) });
  if (!household || household.ownerId !== inviterId) throw new Error("Only the household owner can invite members.");

  const invitee = await findUserByUsername(username);
  if (!invitee) throw new Error("No user found with that username.");

  const alreadyMember = await db.query.householdMembers.findFirst({
    where: and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, invitee.id)),
  });
  if (alreadyMember) throw new Error("That user is already in this household.");

  const existingInvite = await db.query.householdInvites.findFirst({
    where: and(eq(householdInvites.householdId, householdId), eq(householdInvites.invitedUserId, invitee.id)),
  });
  if (existingInvite) throw new Error("That user already has a pending invite to this household.");

  await db.insert(householdInvites).values({ householdId, invitedUserId: invitee.id, invitedByUserId: inviterId });
  await insertNotification({ recipientId: invitee.id, actorId: inviterId, recipeId: null, type: "householdInvite" });
}

export type PendingInvite = { id: string; householdName: string; inviterName: string };

export async function listMyInvites(userId: string): Promise<PendingInvite[]> {
  const inviter = users;
  const rows = await db
    .select({ id: householdInvites.id, householdName: households.name, inviterName: inviter.name })
    .from(householdInvites)
    .innerJoin(households, eq(householdInvites.householdId, households.id))
    .innerJoin(inviter, eq(householdInvites.invitedByUserId, inviter.id))
    .where(eq(householdInvites.invitedUserId, userId));
  return rows;
}

export async function respondToInvite(inviteId: string, userId: string, accept: boolean) {
  const invite = await db.query.householdInvites.findFirst({ where: eq(householdInvites.id, inviteId) });
  if (!invite || invite.invitedUserId !== userId) throw new Error("Invite not found.");

  if (!accept) {
    await db.delete(householdInvites).where(eq(householdInvites.id, inviteId));
    return;
  }

  const existing = await db.query.householdMembers.findFirst({ where: eq(householdMembers.userId, userId) });
  if (existing) throw new Error("You're already in a household. Leave it first.");

  await db.insert(householdMembers).values({ householdId: invite.householdId, userId });
  await db.delete(householdInvites).where(eq(householdInvites.invitedUserId, userId));
}

export async function removeMember(householdId: string, ownerId: string, memberUserId: string) {
  const household = await db.query.households.findFirst({ where: eq(households.id, householdId) });
  if (!household || household.ownerId !== ownerId) throw new Error("Only the household owner can remove members.");
  if (memberUserId === ownerId) throw new Error("The owner can't be removed this way.");

  await db
    .delete(householdMembers)
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, memberUserId)));
}

export async function transferOwnership(householdId: string, currentOwnerId: string, newOwnerId: string) {
  const household = await db.query.households.findFirst({ where: eq(households.id, householdId) });
  if (!household || household.ownerId !== currentOwnerId) {
    throw new Error("Only the household owner can transfer ownership.");
  }
  if (newOwnerId === currentOwnerId) throw new Error("That user is already the owner.");

  const membership = await db.query.householdMembers.findFirst({
    where: and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, newOwnerId)),
  });
  if (!membership) throw new Error("That user isn't a member of this household.");

  await db.update(households).set({ ownerId: newOwnerId }).where(eq(households.id, householdId));
}

export async function leaveHousehold(householdId: string, userId: string) {
  const household = await db.query.households.findFirst({ where: eq(households.id, householdId) });
  if (!household) return;

  if (household.ownerId === userId) {
    await db.delete(households).where(eq(households.id, householdId));
    return;
  }

  await db
    .delete(householdMembers)
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, userId)));
}
