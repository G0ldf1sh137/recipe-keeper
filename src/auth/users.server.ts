import { and, eq, ilike, isNotNull, ne, or } from "drizzle-orm";
import { db } from "#/db/index";
import { users } from "#/db/schema";
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

export async function setUserAdminStatus(userId: string, isAdmin: boolean) {
  return db.update(users).set({ isAdmin }).where(eq(users.id, userId)).returning();
}

export async function setUserCanTranscribeStatus(userId: string, canTranscribe: boolean) {
  return db.update(users).set({ canTranscribe }).where(eq(users.id, userId)).returning();
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
