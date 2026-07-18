import { randomBytes, createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "#/db/index";
import { sessions, users } from "#/db/schema";

const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

export async function createSession(userId: string) {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  return { token, expiresAt };
}

export async function validateSessionToken(token: string) {
  const id = hashToken(token);
  const rows = await db
    .select({ user: users, expiresAt: sessions.expiresAt, impersonatingUserId: sessions.impersonatingUserId })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.id, id));
  const row = rows.at(0);
  if (!row) return null;
  if (row.expiresAt.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, id));
    return null;
  }
  if (!row.impersonatingUserId) {
    return { user: row.user, realUser: row.user, isImpersonating: false };
  }
  const target = await db.query.users.findFirst({ where: eq(users.id, row.impersonatingUserId) });
  if (!target) {
    // Impersonated user was deleted mid-session — self-heal and fall back to the real user.
    await db.update(sessions).set({ impersonatingUserId: null }).where(eq(sessions.id, id));
    return { user: row.user, realUser: row.user, isImpersonating: false };
  }
  return { user: target, realUser: row.user, isImpersonating: true };
}

export async function invalidateSessionToken(token: string) {
  await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
}

export async function setImpersonatedUser(token: string, targetUserId: string | null) {
  await db.update(sessions).set({ impersonatingUserId: targetUserId }).where(eq(sessions.id, hashToken(token)));
}

export async function invalidateAllSessionsForUser(userId: string) {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
