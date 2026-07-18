import { count, eq } from "drizzle-orm";
import { db } from "#/db/index";
import { recipeMakes } from "#/db/schema";

export async function insertMake(recipeId: string, userId: string) {
  await db.insert(recipeMakes).values({ recipeId, userId });
}

export async function countMakes(recipeId: string): Promise<number> {
  const [row] = await db.select({ count: count() }).from(recipeMakes).where(eq(recipeMakes.recipeId, recipeId));
  return row.count;
}
