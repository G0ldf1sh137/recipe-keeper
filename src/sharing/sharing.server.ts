import { eq } from "drizzle-orm";
import { db } from "#/db/index";
import { shares } from "#/db/schema";

export async function resolveShareToken(token: string) {
  const share = await db.query.shares.findFirst({ where: eq(shares.token, token) });
  if (!share) return null;
  if (share.recipeId) return { type: "recipe" as const, id: share.recipeId };
  if (share.collectionId) return { type: "collection" as const, id: share.collectionId };
  return null;
}
