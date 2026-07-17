import { useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getCollection,
  renameCollection,
  deleteCollection,
  toggleRecipeInCollection,
  createCollectionShare,
  revokeCollectionShare,
  updateCollectionVisibility,
} from "#/collections/collections.functions";
import { ShareControl } from "#/sharing/ShareControl";
import { visibilityValues } from "#/db/schema";
import type { Visibility } from "#/db/schema";

const collectionSearchSchema = z.object({ st: z.string().optional() });

export const Route = createFileRoute("/collections/$collectionId")({
  validateSearch: collectionSearchSchema,
  loaderDeps: ({ search }) => ({ shareToken: search.st }),
  loader: async ({ params, deps }) =>
    getCollection({ data: { id: params.collectionId, shareToken: deps.shareToken } }),
  component: CollectionPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-2xl font-semibold text-ink">List not found</h1>
      <p className="mt-2 text-ink/60">
        This list doesn't exist, or isn't shared with you.{" "}
        <Link
          to="/collections"
          className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          Back to your lists
        </Link>
      </p>
    </div>
  ),
});

function CollectionPage() {
  const { collection, items } = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const renameFn = useServerFn(renameCollection);
  const deleteFn = useServerFn(deleteCollection);
  const toggleFn = useServerFn(toggleRecipeInCollection);
  const createShareFn = useServerFn(createCollectionShare);
  const revokeShareFn = useServerFn(revokeCollectionShare);
  const updateVisibilityFn = useServerFn(updateCollectionVisibility);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(collection.name);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await renameFn({ data: { id: collection.id, name: name.trim() } });
    setEditing(false);
    await router.invalidate();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${collection.name}"? This can't be undone.`)) return;
    await deleteFn({ data: { id: collection.id } });
    await navigate({ to: "/collections" });
  }

  async function handleRemove(recipeId: string) {
    await toggleFn({ data: { collectionId: collection.id, recipeId } });
    await router.invalidate();
  }

  async function handleVisibilityChange(visibility: Visibility) {
    await updateVisibilityFn({ data: { id: collection.id, visibility } });
    await router.invalidate();
  }

  async function handleShare() {
    await createShareFn({ data: { collectionId: collection.id } });
    await router.invalidate();
  }

  async function handleRevokeShare() {
    await revokeShareFn({ data: { collectionId: collection.id } });
    await router.invalidate();
  }

  function handleRandom() {
    const item = items[Math.floor(Math.random() * items.length)];
    void navigate({ to: "/recipes/$recipeId", params: { recipeId: item.id } });
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <Link
        to="/collections"
        className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
      >
        ← Your cookbooks
      </Link>

      <div className="mt-4 flex items-center justify-between">
        {editing ? (
          <form onSubmit={handleRename} className="flex flex-1 gap-2">
            <input
              className="flex-1 rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setName(collection.name);
              }}
              className="text-sm text-ink/50 hover:text-ink"
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">{collection.name}</h1>
            <div className="flex gap-3">
              {items.length > 0 && (
                <button
                  type="button"
                  onClick={handleRandom}
                  className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
                >
                  Random recipe
                </button>
              )}
              {collection.isOwner && (
                <>
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {collection.isOwner ? (
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium text-ink/70">Visibility</span>
            <select
              className="rounded-lg border border-accent-100 px-2 py-1 text-sm focus:border-accent-400 focus:outline-none"
              value={collection.visibility}
              onChange={(e) => handleVisibilityChange(e.target.value as Visibility)}
            >
              {visibilityValues.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <ShareControl
            shareUrl={collection.shareUrl}
            disabled={collection.visibility === "private"}
            onShare={handleShare}
            onRevoke={handleRevokeShare}
          />
        </div>
      ) : (
        <span className="mt-3 block text-xs font-medium uppercase tracking-wide text-accent-600">
          {collection.visibility}
        </span>
      )}

      {items.length === 0 ? (
        <p className="mt-6 text-ink/60">No recipes saved to this list yet.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded-xl border-2 border-accent-200 bg-surface px-4 py-3 shadow-sm"
            >
              <Link
                to="/recipes/$recipeId"
                params={{ recipeId: item.id }}
                className="font-serif text-lg font-medium text-ink"
              >
                {item.title}
              </Link>
              {collection.isOwner && (
                <button
                  type="button"
                  onClick={() => handleRemove(item.id)}
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Remove
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
