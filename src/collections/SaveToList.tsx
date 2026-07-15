import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createCollection, toggleRecipeInCollection } from "./collections.functions";

type CollectionOption = { id: string; name: string; inCollection: boolean };

export function SaveToList({
  recipeId,
  collections,
  canSave,
}: {
  recipeId: string;
  collections: CollectionOption[];
  canSave: boolean;
}) {
  const router = useRouter();
  const toggleFn = useServerFn(toggleRecipeInCollection);
  const createFn = useServerFn(createCollection);
  const [newListName, setNewListName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function handleToggle(collectionId: string) {
    setBusy(collectionId);
    try {
      await toggleFn({ data: { collectionId, recipeId } });
      await router.invalidate();
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newListName.trim()) return;
    setBusy("new");
    try {
      const collection = await createFn({ data: { name: newListName.trim() } });
      await toggleFn({ data: { collectionId: collection.id, recipeId } });
      setNewListName("");
      await router.invalidate();
    } finally {
      setBusy(null);
    }
  }

  if (!canSave) {
    return (
      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold text-ink">Save to a list</h2>
        <p className="mt-3 text-sm text-ink/60">
          <a
            href="/auth/google"
            className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            Sign in with Google
          </a>{" "}
          to save this recipe to a list.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="font-serif text-xl font-semibold text-ink">Save to a list</h2>

      {collections.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {collections.map((collection) => (
            <button
              key={collection.id}
              type="button"
              onClick={() => handleToggle(collection.id)}
              disabled={busy === collection.id}
              className={
                collection.inCollection
                  ? "rounded-full bg-accent-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
                  : "rounded-full border border-accent-200 px-3 py-1 text-sm font-medium text-ink hover:bg-accent-50 disabled:opacity-50"
              }
            >
              {collection.inCollection ? `✓ ${collection.name}` : collection.name}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleCreateAndAdd} className="mt-3 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-accent-100 px-3 py-1.5 text-sm focus:border-accent-400 focus:outline-none"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          placeholder="New list name"
        />
        <button
          type="submit"
          disabled={busy === "new" || !newListName.trim()}
          className="rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
        >
          {busy === "new" ? "Adding..." : "+ New list"}
        </button>
      </form>
    </section>
  );
}
