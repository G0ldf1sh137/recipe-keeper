import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ShoppingCart } from "lucide-react";
import { addGroceryItem, createGroceryList } from "./grocery.functions";
import { DropdownButton } from "#/ui/DropdownButton";

type GroceryListOption = { id: string; name: string };

export function presenceKey(listId: string, name: string, unit: string): string {
  return `${listId}::${name.trim().toLowerCase()}::${unit.trim().toLowerCase()}`;
}

export function AddIngredientToGroceryList({
  qty,
  unit,
  name,
  groceryLists,
  presence,
  loading,
}: {
  qty: string;
  unit: string;
  name: string;
  groceryLists: GroceryListOption[];
  presence: Set<string>;
  loading: boolean;
}) {
  const router = useRouter();
  const addFn = useServerFn(addGroceryItem);
  const createFn = useServerFn(createGroceryList);
  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [addedListIds, setAddedListIds] = useState<Set<string>>(new Set());

  function isAlreadyOnList(listId: string): boolean {
    return addedListIds.has(listId) || presence.has(presenceKey(listId, name, unit));
  }

  async function handleAdd(listId: string) {
    if (isAlreadyOnList(listId) && !window.confirm(`${name} is already on this list. Add it again?`)) {
      return;
    }
    setBusy(listId);
    try {
      await addFn({ data: { listId, qty, unit, name } });
      setAddedListIds((prev) => new Set(prev).add(listId));
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
      await addFn({ data: { listId: list.id, qty, unit, name } });
      setNewListName("");
      setCreating(false);
      setAddedListIds((prev) => new Set(prev).add(list.id));
      await router.invalidate();
    } finally {
      setBusy(null);
    }
  }

  return (
    <DropdownButton label="Add to grocery list" icon={<ShoppingCart size={14} />} iconOnly disabled={loading}>
      {groceryLists.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {groceryLists.map((list) => (
            <button
              key={list.id}
              type="button"
              onClick={() => handleAdd(list.id)}
              disabled={busy === list.id}
              className={
                addedListIds.has(list.id)
                  ? "rounded-full bg-accent-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
                  : "rounded-full border-2 border-accent-300 px-3 py-1 text-sm font-medium text-ink hover:bg-accent-50 disabled:opacity-50"
              }
            >
              {addedListIds.has(list.id) ? `✓ ${list.name}` : list.name}
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
