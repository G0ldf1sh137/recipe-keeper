import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShoppingCart } from "lucide-react";
import { createGroceryList, toggleRecipeInGroceryList } from "./grocery.functions";
import { DropdownButton } from "#/ui/DropdownButton";

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
  const [creating, setCreating] = useState(false);
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
        <ShoppingCart size={16} />
        Grocery list
      </a>
    );
  }

  const savedCount = groceryLists.filter((l) => l.inList).length;

  return (
    <DropdownButton label="Grocery list" icon={<ShoppingCart size={16} />} badge={savedCount || undefined}>
      {groceryLists.length > 0 && (
        <div className="flex flex-wrap gap-2">
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

      {creating ? (
        <form onSubmit={handleCreateAndAdd} className={`flex gap-2 ${groceryLists.length > 0 ? "mt-3" : ""}`}>
          <input
            className="flex-1 rounded-lg border border-accent-100 px-2 py-1 text-sm focus:border-accent-400 focus:outline-none"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            placeholder="New list name"
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
          className={`text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400 ${groceryLists.length > 0 ? "mt-3" : ""}`}
        >
          + New list
        </button>
      )}
    </DropdownButton>
  );
}
