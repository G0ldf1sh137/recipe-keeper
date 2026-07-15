import { eq } from "drizzle-orm";
import { db } from "#/db/index";
import { users } from "#/db/schema";
import type { GoogleUserInfo } from "./google.server";

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

  const [created] = await db
    .insert(users)
    .values({
      googleId: profile.sub,
      email: profile.email,
      name: profile.name,
      avatarUrl: profile.picture,
    })
    .returning();
  return created;
}
