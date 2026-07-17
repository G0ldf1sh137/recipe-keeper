import { and, eq } from "drizzle-orm";
import { db } from "#/db/index";
import { recipeNotes } from "#/db/schema";

export async function findNote(recipeId: string, userId: string) {
  return db.query.recipeNotes.findFirst({
    where: and(eq(recipeNotes.recipeId, recipeId), eq(recipeNotes.userId, userId)),
  });
}

// "No note" is modeled as "no row" — saving an empty textarea deletes it
// rather than storing an empty string, so there's no separate delete action.
export async function upsertNote(recipeId: string, userId: string, text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    await db
      .delete(recipeNotes)
      .where(and(eq(recipeNotes.recipeId, recipeId), eq(recipeNotes.userId, userId)));
    return undefined;
  }

  await db
    .insert(recipeNotes)
    .values({ recipeId, userId, text: trimmed })
    .onConflictDoUpdate({
      target: [recipeNotes.recipeId, recipeNotes.userId],
      set: { text: trimmed, updatedAt: new Date() },
    });
  return findNote(recipeId, userId);
}
