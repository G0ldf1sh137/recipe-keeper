import { and, eq, ilike, isNotNull, ne, or } from "drizzle-orm";
import { db } from "#/db/index";
import { users } from "#/db/schema";
import type { Visibility, WeekStartDay } from "#/db/schema";
import type { GoogleUserInfo } from "./google.server";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "");
}

export async function generateUniqueUsername(name: string, email: string) {
  const base = slugify(name) || slugify(email.split("@")[0]) || "user";
  let candidate = base;
  let suffix = 2;
  while (await db.query.users.findFirst({ where: eq(users.username, candidate) })) {
    candidate = `${base.slice(0, 30 - String(suffix).length - 1)}-${suffix}`;
    suffix++;
  }
  return candidate;
}

export async function findUserByUsername(username: string) {
  return db.query.users.findFirst({ where: eq(users.username, username.toLowerCase()) });
}

export async function findUserById(id: string) {
  return db.query.users.findFirst({ where: eq(users.id, id) });
}

export async function updateUserUsername(userId: string, username: string) {
  const taken = await db.query.users.findFirst({
    where: and(eq(users.username, username), ne(users.id, userId)),
  });
  if (taken) return { error: "That username is taken." } as const;

  const [updated] = await db.update(users).set({ username }).where(eq(users.id, userId)).returning();
  return { user: updated } as const;
}

export async function searchUsers(query: string, limit = 20) {
  const term = `%${query}%`;
  return db.query.users.findMany({
    where: or(ilike(users.name, term), ilike(users.email, term), ilike(users.username, term)),
    orderBy: (u, { asc }) => [asc(u.name)],
    limit,
  });
}

export async function listAllUsernames(): Promise<string[]> {
  const rows = await db.query.users.findMany({
    where: isNotNull(users.username),
    columns: { username: true },
    orderBy: (u, { asc }) => [asc(u.username)],
  });
  return rows.map((row) => row.username).filter((username) => username != null);
}

// Only subscribers/admins, since only they can access the pantry a household invite grants access to.
export async function listInvitableUsernames(): Promise<string[]> {
  const rows = await db.query.users.findMany({
    where: and(isNotNull(users.username), or(eq(users.isAdmin, true), eq(users.isSubscriber, true))),
    columns: { username: true },
    orderBy: (u, { asc }) => [asc(u.username)],
  });
  return rows.map((row) => row.username).filter((username) => username != null);
}

export async function setUserAdminStatus(userId: string, isAdmin: boolean) {
  return db.update(users).set({ isAdmin }).where(eq(users.id, userId)).returning();
}

export async function setUserModeratorStatus(userId: string, isModerator: boolean) {
  return db.update(users).set({ isModerator }).where(eq(users.id, userId)).returning();
}

export async function setUserIsSubscriberStatus(userId: string, isSubscriber: boolean) {
  return db.update(users).set({ isSubscriber }).where(eq(users.id, userId)).returning();
}

export async function updateUserVisibilityDefaults(
  userId: string,
  prefs: { defaultRecipeVisibility: Visibility; defaultCollectionVisibility: Visibility },
) {
  return db.update(users).set(prefs).where(eq(users.id, userId)).returning();
}

export async function updateUserWeekStartDay(userId: string, weekStartDay: WeekStartDay) {
  return db.update(users).set({ weekStartDay }).where(eq(users.id, userId)).returning();
}

export async function updateUserName(userId: string, name: string) {
  return db.update(users).set({ name }).where(eq(users.id, userId)).returning();
}

export async function updateUserAvatarOverride(userId: string, avatarOverrideUrl: string | null) {
  return db.update(users).set({ avatarOverrideUrl }).where(eq(users.id, userId)).returning();
}

export async function updateUserMessagingPreferences(
  userId: string,
  prefs: { restrictMessagesToFollowing: boolean },
) {
  return db.update(users).set(prefs).where(eq(users.id, userId)).returning();
}

export async function deleteUser(userId: string) {
  return db.delete(users).where(eq(users.id, userId)).returning();
}

export async function upsertGoogleUser(profile: GoogleUserInfo) {
  const existing = await db.query.users.findFirst({
    where: eq(users.googleId, profile.sub),
  });

  if (existing) {
    const [updated] = await db
      .update(users)
      .set({ email: profile.email, name: profile.name, avatarUrl: profile.picture })
      .where(eq(users.id, existing.id))
      .returning();
    return updated;
  }

  const username = await generateUniqueUsername(profile.name, profile.email);
  const [created] = await db
    .insert(users)
    .values({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture,
      username,
    })
    .returning();
  return created;
}
