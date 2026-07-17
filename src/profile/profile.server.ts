import { findUserByUsername } from "#/auth/users.server";
import { findRecipes } from "#/recipes/recipes.server";
import { findPublicCollectionsByOwner } from "#/collections/collections.server";

export async function getPublicProfile(username: string) {
  const user = await findUserByUsername(username);
  if (!user) return undefined;

  const [{ recipes }, collections] = await Promise.all([
    findRecipes({ ownerId: user.id, visibility: "public" }, undefined),
    findPublicCollectionsByOwner(user.id),
  ]);

  return {
    user: { id: user.id, name: user.name, avatarUrl: user.avatarUrl, username: user.username },
    recipes,
    collections,
  };
}
