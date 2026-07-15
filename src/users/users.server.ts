import { eq } from "drizzle-orm";
import { db } from "#/db/index";
import { users } from "#/db/schema";

// Stand-in for a real session (see design-plan.md milestone 4: Auth).
// Every visitor acts as this single demo user until login exists.
const DEMO_USER_EMAIL = "demo@recipe-keeper.local";

export async function getOrCreateDemoUser() {
  const existing = await db.query.users.findFirst({
    where: eq(users.email, DEMO_USER_EMAIL),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(users)
    .values({ email: DEMO_USER_EMAIL, name: "Demo Cook" })
    .returning();
  return created;
}
