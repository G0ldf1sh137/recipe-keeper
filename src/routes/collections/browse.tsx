import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { listPublicCollections } from "#/collections/collections.functions";

const browseSearchSchema = z.object({ q: z.string().min(1).optional() });

export const Route = createFileRoute("/collections/browse")({
  validateSearch: browseSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => listPublicCollections({ data: deps }),
  component: BrowseCollectionsPage,
});

function BrowseCollectionsPage() {
  const collections = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [qInput, setQInput] = useState(search.q ?? "");
  useEffect(() => setQInput(search.q ?? ""), [search.q]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ search: { q: qInput.trim() || undefined } });
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <Link
        to="/collections"
        className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
      >
        ← Your cookbooks
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-ink">Browse cookbooks</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
        <input
          className="flex-1 rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
          value={qInput}
          onChange={(e) => setQInput(e.target.value)}
          placeholder="Search cookbooks"
        />
        <button
          type="submit"
          className="rounded-lg border-2 border-accent-300 px-4 py-2 font-medium text-ink transition-colors hover:bg-accent-50"
        >
          Search
        </button>
      </form>

      {collections.length === 0 ? (
        <p className="mt-6 text-ink/60">
          {search.q ? `No cookbooks match "${search.q}".` : "No public cookbooks yet."}
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {collections.map((collection) => (
            <li
              key={collection.id}
              className="flex items-center justify-between rounded-xl border-2 border-accent-200 bg-surface px-4 py-3 shadow-sm"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <Link
                    to="/collections/$collectionId"
                    params={{ collectionId: collection.id }}
                    className="font-serif text-lg font-medium text-ink hover:text-accent-600 dark:hover:text-accent-400"
                  >
                    {collection.name}
                  </Link>
                  {collection.visibility === "private" && (
                    <span className="text-xs font-medium uppercase tracking-wide text-accent-600">Private</span>
                  )}
                </div>
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
              <span className="text-sm text-ink/50">
                {collection.recipeCount} recipe{collection.recipeCount === 1 ? "" : "s"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
