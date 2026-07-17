import { useState } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSessionUser } from "#/auth/auth.functions";
import {
  listMyCollections,
  createCollection,
  renameCollection,
  deleteCollection,
} from "#/collections/collections.functions";

export const Route = createFileRoute("/collections/")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
  },
  loader: () => listMyCollections(),
  component: CollectionsPage,
});

function CollectionsPage() {
  const collections = Route.useLoaderData();
  const router = useRouter();
  const createFn = useServerFn(createCollection);
  const renameFn = useServerFn(renameCollection);
  const deleteFn = useServerFn(deleteCollection);

  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [query, setQuery] = useState("");

  const filteredCollections = collections.filter((collection) =>
    collection.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createFn({ data: { name: name.trim() } });
      setName("");
      await router.invalidate();
    } finally {
      setCreating(false);
    }
  }

  function startEditing(id: string, currentName: string) {
    setEditingId(id);
    setEditingName(currentName);
  }

  async function handleRename(id: string) {
    if (!editingName.trim()) return;
    await renameFn({ data: { id, name: editingName.trim() } });
    setEditingId(null);
    await router.invalidate();
  }

  async function handleDelete(id: string, listName: string) {
    if (!window.confirm(`Delete "${listName}"? This can't be undone.`)) return;
    await deleteFn({ data: { id } });
    await router.invalidate();
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Your cookbooks</h1>

      <form onSubmit={handleCreate} className="mt-6 flex gap-3">
        <input
          className="flex-1 rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New cookbook name"
        />
        <button
          type="submit"
          disabled={creating || !name.trim()}
          className="rounded-lg bg-accent-600 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
        >
          {creating ? "Creating..." : "Create"}
        </button>
      </form>

      {collections.length > 0 && (
        <input
          className="mt-6 w-full rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your cookbooks"
        />
      )}

      {collections.length === 0 ? (
        <p className="mt-6 text-ink/60">No cookbooks yet. Create one to start bookmarking recipes.</p>
      ) : filteredCollections.length === 0 ? (
        <p className="mt-6 text-ink/60">No cookbooks match "{query}".</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {filteredCollections.map((collection) => (
            <li
              key={collection.id}
              className="flex items-center justify-between rounded-xl border-2 border-accent-200 bg-surface px-4 py-3 shadow-sm"
            >
              {editingId === collection.id ? (
                <form
                  className="flex flex-1 gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void handleRename(collection.id);
                  }}
                >
                  <input
                    className="flex-1 rounded-lg border border-accent-100 px-2 py-1 focus:border-accent-400 focus:outline-none"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
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
                    onClick={() => setEditingId(null)}
                    className="text-sm text-ink/50 hover:text-ink"
                  >
                    Cancel
                  </button>
                </form>
              ) : (
                <>
                  <Link
                    to="/collections/$collectionId"
                    params={{ collectionId: collection.id }}
                    className="font-serif text-lg font-medium text-ink"
                  >
                    {collection.name}
                  </Link>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-ink/50">
                      {collection.recipeCount} recipe{collection.recipeCount === 1 ? "" : "s"}
                    </span>
                    <button
                      type="button"
                      onClick={() => startEditing(collection.id, collection.name)}
                      className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
                    >
                      Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(collection.id, collection.name)}
                      className="text-sm font-medium text-red-600 hover:text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
