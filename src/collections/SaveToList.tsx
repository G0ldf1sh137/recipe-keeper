import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { BookOpen } from "lucide-react";
import { createCollection, toggleRecipeInCollection } from "./collections.functions";
import { DropdownButton } from "#/ui/DropdownButton";

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
  const [creating, setCreating] = useState(false);
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
      setCreating(false);
      await router.invalidate();
    } finally {
      setBusy(null);
    }
  }

  if (!canSave) {
    return (
      <a
        href="/auth/google"
        className="flex items-center gap-1.5 rounded-lg border-2 border-accent-300 px-3 py-1.5 text-sm font-medium text-ink hover:bg-accent-50"
      >
        <BookOpen size={16} />
        Cookbook
      </a>
    );
  }

  const savedCount = collections.filter((c) => c.inCollection).length;

  return (
    <DropdownButton label="Cookbook" icon={<BookOpen size={16} />} badge={savedCount || undefined}>
      {collections.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {collections.map((collection) => (
            <button
              key={collection.id}
              type="button"
              onClick={() => handleToggle(collection.id)}
              disabled={busy === collection.id}
              className={
                collection.inCollection
                  ? "rounded-full bg-accent-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
                  : "rounded-full border-2 border-accent-300 px-3 py-1 text-sm font-medium text-ink hover:bg-accent-50 disabled:opacity-50"
              }
            >
              {collection.inCollection ? `✓ ${collection.name}` : collection.name}
            </button>
          ))}
        </div>
      )}

      {creating ? (
        <form onSubmit={handleCreateAndAdd} className={`flex gap-2 ${collections.length > 0 ? "mt-3" : ""}`}>
          <input
            className="flex-1 rounded-lg border border-accent-100 px-2 py-1 text-sm focus:border-accent-400 focus:outline-none"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="New cookbook name"
            autoFocus
          />
          <button
            type="submit"
            disabled={busy === "new" || !newListName.trim()}
            className="rounded-lg bg-accent-600 px-2.5 py-1 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
          >
            {busy === "new" ? "Adding..." : "Add"}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={`text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400 ${collections.length > 0 ? "mt-3" : ""}`}
        >
          + New cookbook
        </button>
      )}
    </DropdownButton>
  );
}
