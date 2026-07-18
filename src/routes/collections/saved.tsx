import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSessionUser } from "#/auth/auth.functions";
import { listSavedCollections, toggleCollectionBookmark } from "#/collections/collections.functions";

export const Route = createFileRoute("/collections/saved")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
  },
  loader: () => listSavedCollections(),
  component: SavedCollectionsPage,
});

function SavedCollectionsPage() {
  const collections = Route.useLoaderData();
  const router = useRouter();
  const toggleBookmarkFn = useServerFn(toggleCollectionBookmark);

  async function handleUnsave(collectionId: string) {
    await toggleBookmarkFn({ data: { collectionId } });
    await router.invalidate();
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <Link
        to="/collections"
        className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
      >
        ← Your cookbooks
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-ink">Saved cookbooks</h1>

      {collections.length === 0 ? (
        <p className="mt-6 text-ink/60">
          No saved cookbooks yet.{" "}
          <Link
            to="/collections/browse"
            className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            Browse cookbooks
          </Link>{" "}
          to find some.
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {collections.map((collection) => (
            <li
              key={collection.id}
              className="flex items-center justify-between rounded-xl border-2 border-accent-200 bg-surface px-4 py-3 shadow-sm"
            >
              <div className="flex flex-col">
                <Link
                  to="/collections/$collectionId"
                  params={{ collectionId: collection.id }}
                  className="font-serif text-lg font-medium text-ink hover:text-accent-600 dark:hover:text-accent-400"
                >
                  {collection.name}
                </Link>
                {collection.ownerUsername ? (
                  <Link
                    to="/u/$username"
                    params={{ username: collection.ownerUsername }}
                    className="text-sm text-ink/60 hover:text-accent-600 dark:hover:text-accent-400"
                  >
                    by {collection.ownerName}
                  </Link>
                ) : (
                  <span className="text-sm text-ink/60">by {collection.ownerName}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-ink/50">
                  {collection.recipeCount} recipe{collection.recipeCount === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  onClick={() => handleUnsave(collection.id)}
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Unsave
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
