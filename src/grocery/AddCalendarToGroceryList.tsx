import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createGroceryList, addCalendarToGroceryList } from "./grocery.functions";

type GroceryListOption = { id: string; name: string };

export function AddCalendarToGroceryList({
  calendarId,
  shareToken,
  groceryLists,
  canSave,
}: {
  calendarId: string;
  shareToken?: string;
  groceryLists: GroceryListOption[];
  canSave: boolean;
}) {
  const addFn = useServerFn(addCalendarToGroceryList);
  const createFn = useServerFn(createGroceryList);
  const [newListName, setNewListName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [results, setResults] = useState<Partial<Record<string, { message: string; listId: string }>>>({});

  function resultMessage(addedEntryCount: number, totalEntries: number) {
    if (totalEntries === 0) return "This calendar has no recipes yet.";
    return `Added ingredients for ${addedEntryCount} of ${totalEntries} planned meals.`;
  }

  async function handleAdd(listId: string) {
    setBusy(listId);
    try {
      const { addedEntryCount, totalEntries } = await addFn({ data: { calendarId, listId, shareToken } });
      setResults((prev) => ({ ...prev, [listId]: { message: resultMessage(addedEntryCount, totalEntries), listId } }));
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
      const { addedEntryCount, totalEntries } = await addFn({
        data: { calendarId, listId: list.id, shareToken },
      });
      setNewListName("");
      setResults((prev) => ({
        ...prev,
        [list.id]: { message: resultMessage(addedEntryCount, totalEntries), listId: list.id },
      }));
    } finally {
      setBusy(null);
    }
  }

  if (!canSave) {
    return (
      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold text-ink">Add this week's recipes to a grocery list</h2>
        <p className="mt-3 text-sm text-ink/60">
          <a
            href="/auth/google"
            className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            Sign in with Google
          </a>{" "}
          to add these recipes' ingredients to a grocery list.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="font-serif text-xl font-semibold text-ink">Add this week's recipes to a grocery list</h2>

      {groceryLists.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          {groceryLists.map((list) => {
            const result = results[list.id];
            return (
              <div key={list.id} className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleAdd(list.id)}
                  disabled={busy === list.id}
                  className="rounded-full border-2 border-accent-300 px-3 py-1 text-sm font-medium text-ink hover:bg-accent-50 disabled:opacity-50"
                >
                  {busy === list.id ? "Adding..." : `Add to ${list.name}`}
                </button>
                {result && (
                  <span className="text-sm text-ink/60">
                    {result.message}{" "}
                    <Link
                      to="/grocery/$listId"
                      params={{ listId: list.id }}
                      className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
                    >
                      View list
                    </Link>
                  </span>
                )}
              </div>
            );
          })}
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
