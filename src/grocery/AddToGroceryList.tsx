import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createGroceryList, toggleRecipeInGroceryList } from "./grocery.functions";

type GroceryListOption = { id: string; name: string; inList: boolean };

export function AddToGroceryList({
  recipeId,
  groceryLists,
  canSave,
}: {
  recipeId: string;
  groceryLists: GroceryListOption[];
  canSave: boolean;
}) {
  const router = useRouter();
  const toggleFn = useServerFn(toggleRecipeInGroceryList);
  const createFn = useServerFn(createGroceryList);
  const [newListName, setNewListName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function handleToggle(listId: string) {
    setBusy(listId);
    try {
      await toggleFn({ data: { listId, recipeId } });
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
      const list = await createFn({ data: { name: newListName.trim() } });
      await toggleFn({ data: { listId: list.id, recipeId } });
      setNewListName("");
      await router.invalidate();
    } finally {
      setBusy(null);
    }
  }

  if (!canSave) {
    return (
      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold text-ink">Add to grocery list</h2>
        <p className="mt-3 text-sm text-ink/60">
          <a
            href="/auth/google"
            className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            Sign in with Google
          </a>{" "}
          to add this recipe's ingredients to a grocery list.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="font-serif text-xl font-semibold text-ink">Add to grocery list</h2>

      {groceryLists.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {groceryLists.map((list) => (
            <button
              key={list.id}
              type="button"
              onClick={() => handleToggle(list.id)}
              disabled={busy === list.id}
              className={
                list.inList
                  ? "rounded-full bg-accent-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
                  : "rounded-full border-2 border-accent-300 px-3 py-1 text-sm font-medium text-ink hover:bg-accent-50 disabled:opacity-50"
              }
            >
              {list.inList ? `✓ ${list.name}` : list.name}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleCreateAndAdd} className="mt-3 flex gap-2">
        <input
          className="flex-1 rounded-lg border border-accent-100 px-3 py-1.5 text-sm focus:border-accent-400 focus:outline-none"
          value={newListName}
          onChange={(e) => setNewListName(e.target.value)}
          placeholder="New grocery list name"
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
