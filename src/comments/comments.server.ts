import { and, eq, sql } from "drizzle-orm";
import { db } from "#/db/index";
import { comments, users, blocks, mutes } from "#/db/schema";
import type { z } from "zod";
import type { createCommentSchema } from "./schemas";

export type CommentNode = {
  id: string;
  recipeId: string;
  parentId: string | null;
  body: string;
  createdAt: Date;
  author: { id: string; name: string; avatarUrl: string | null; username: string | null };
  replies: CommentNode[];
};

// Mutual: a blocked author's comments are hidden from the viewer, and vice
// versa, on any recipe regardless of who owns it.
function noWallWithAuthor(viewerId: string | undefined) {
  if (!viewerId) return sql`true`;
  return sql`not exists (
    select 1 from ${blocks}
    where (${blocks.blockerId} = ${viewerId} and ${blocks.blockedId} = ${comments.authorId})
       or (${blocks.blockerId} = ${comments.authorId} and ${blocks.blockedId} = ${viewerId})
  )`;
}

// One-directional: only hides the muted author's comments from the muter.
function notMutedAuthor(viewerId: string | undefined) {
  if (!viewerId) return sql`true`;
  return sql`not exists (
    select 1 from ${mutes}
    where ${mutes.muterId} = ${viewerId} and ${mutes.mutedId} = ${comments.authorId}
  )`;
}

export async function findCommentTreeForRecipe(
  recipeId: string,
  viewerId: string | undefined,
): Promise<CommentNode[]> {
  const rows = await db
    .select({
      id: comments.id,
      recipeId: comments.recipeId,
      parentId: comments.parentId,
      body: comments.body,
      createdAt: comments.createdAt,
      author: {
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
        avatarOverrideUrl: users.avatarOverrideUrl,
        username: users.username,
      },
    })
    .from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(and(eq(comments.recipeId, recipeId), noWallWithAuthor(viewerId), notMutedAuthor(viewerId)))
    .orderBy(comments.createdAt);

  const byId = new Map<string, CommentNode>();
  for (const row of rows) {
    const { avatarOverrideUrl, ...author } = row.author;
    byId.set(row.id, { ...row, author: { ...author, avatarUrl: avatarOverrideUrl ?? author.avatarUrl }, replies: [] });
  }

  const roots: CommentNode[] = [];
  for (const row of rows) {
    const node = byId.get(row.id);
    if (!node) continue;
    const parent = row.parentId ? byId.get(row.parentId) : undefined;
    if (parent) parent.replies.push(node);
    else roots.push(node);
  }
  return roots;
}

export async function findCommentById(id: string) {
  return db.query.comments.findFirst({ where: eq(comments.id, id) });
}

export async function insertComment(input: z.infer<typeof createCommentSchema>, authorId: string) {
  const [comment] = await db
    .insert(comments)
    .values({ recipeId: input.recipeId, parentId: input.parentId, body: input.body, authorId })
    .returning();
  return comment;
}

export async function deleteCommentById(id: string) {
  const rows = await db.delete(comments).where(eq(comments.id, id)).returning();
  return rows.at(0);
}
