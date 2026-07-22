import { findUserByUsername } from "#/auth/users.server";
import { findRecipes } from "#/recipes/recipes.server";
import { findPublicCollectionsByOwner } from "#/collections/collections.server";
import { countFollowers, countFollowing, findFollow } from "#/follows/follows.server";
import { hasWallBetween } from "#/blocks/blocks.server";
import { isMuted } from "#/mutes/mutes.server";

export async function getPublicProfile(username: string, viewerId: string | undefined) {
  const user = await findUserByUsername(username);
  if (!user) return undefined;

  // Full mutual invisibility: if either party has blocked the other, the
  // profile doesn't exist as far as the viewer is concerned.
  if (viewerId && viewerId !== user.id && (await hasWallBetween(viewerId, user.id))) {
    return undefined;
  }

  const canFollow = !!viewerId && viewerId !== user.id;
  const canMessage = !!viewerId && viewerId !== user.id;
  const canMute = !!viewerId && viewerId !== user.id;

  const [{ recipes }, collections, followerCount, followingCount, existingFollow, existingMute] =
    await Promise.all([
      findRecipes({ ownerId: user.id, visibility: "public" }, undefined),
      findPublicCollectionsByOwner(user.id),
      countFollowers(user.id),
      countFollowing(user.id),
      canFollow ? findFollow(viewerId, user.id) : Promise.resolve(undefined),
      canMute ? isMuted(viewerId, user.id) : Promise.resolve(false),
    ]);
  const isFollowing = !!existingFollow;

  return {
    user: {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarOverrideUrl ?? user.avatarUrl,
      username: user.username,
    },
    recipes,
    collections,
    followerCount,
    followingCount,
    canFollow,
    isFollowing,
    canMessage,
    canBlock: canFollow,
    canMute,
    isMuted: existingMute,
  };
}
