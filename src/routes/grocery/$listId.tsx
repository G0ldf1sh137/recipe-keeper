import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSessionUser } from "#/auth/auth.functions";
import {
  getGroceryList,
  renameGroceryList,
  deleteGroceryList,
  addGroceryItem,
  setGroupChecked,
} from "#/grocery/grocery.functions";
import { addPantryItem } from "#/pantry/pantry.functions";
import { Toast } from "#/ui/Toast";

export const Route = createFileRoute("/grocery/$listId")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
    if (!user.isAdmin && !user.isSubscriber) {
      throw redirect({ to: "/subscribers-only", search: { feature: "grocery" } });
    }
  },
  loader: async ({ params }) => getGroceryList({ data: { id: params.listId } }),
  component: GroceryListPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-2xl font-semibold text-ink">List not found</h1>
      <p className="mt-2 text-ink/60">
        This grocery list doesn't exist, or isn't yours.{" "}
        <Link
          to="/grocery"
          className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          Back to your grocery lists
        </Link>
      </p>
    </div>
  ),
});

function GroceryListPage() {
  const { list, groups: loaderGroups } = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const renameFn = useServerFn(renameGroceryList);
  const deleteFn = useServerFn(deleteGroceryList);
  const addItemFn = useServerFn(addGroceryItem);
  const setCheckedFn = useServerFn(setGroupChecked);
  const addPantryItemFn = useServerFn(addPantryItem);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(list.name);
  const [itemQty, setItemQty] = useState("");
  const [itemUnit, setItemUnit] = useState("");
  const [itemName, setItemName] = useState("");
  const [adding, setAdding] = useState(false);
  const [groups, setGroups] = useState(loaderGroups);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const pendingClearRef = useRef<{ previousGroups: typeof loaderGroups; timeoutId: number } | null>(null);

  useEffect(() => {
    setGroups(loaderGroups);
  }, [loaderGroups]);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await renameFn({ data: { id: list.id, name: name.trim() } });
    setEditing(false);
    await router.invalidate();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${list.name}"? This can't be undone.`)) return;
    await deleteFn({ data: { id: list.id } });
    await navigate({ to: "/grocery" });
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim()) return;
    setAdding(true);
    try {
      await addItemFn({ data: { listId: list.id, qty: itemQty, unit: itemUnit, name: itemName } });
      setItemQty("");
      setItemUnit("");
      setItemName("");
      await router.invalidate();
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleLine(itemIds: string[], checked: boolean) {
    await setCheckedFn({ data: { listId: list.id, itemIds, checked: !checked } });
    await router.invalidate();
  }

  function handleAddCheckedToPantry() {
    const checkedGroups = groups.filter((g) => g.lines.some((l) => l.checked));
    if (checkedGroups.length === 0) return;
    const pantryNames = checkedGroups.map((g) => g.name);

    // Checked items are things the user just bought, so they're now on hand —
    // optimistically move them into "Already in your pantry" immediately (they
    // stay on the list, matching how a real pantry addition would re-categorize
    // them once the loader refetches); the actual pantry write is delayed 5s so
    // "Undo" can cancel it.
    const previousGroups = groups;
    setGroups((prev) => prev.map((g) => (pantryNames.includes(g.name) ? { ...g, inPantry: true } : g)));

    window.clearTimeout(pendingClearRef.current?.timeoutId);
    const timeoutId = window.setTimeout(async () => {
      pendingClearRef.current = null;
      setShowUndoToast(false);
      await Promise.all(pantryNames.map((ingredientName) => addPantryItemFn({ data: { name: ingredientName } })));
      await router.invalidate();
    }, 5000);

    pendingClearRef.current = { previousGroups, timeoutId };
    setShowUndoToast(true);
  }

  function handleUndoAddToPantry() {
    const pending = pendingClearRef.current;
    if (!pending) return;
    window.clearTimeout(pending.timeoutId);
    pendingClearRef.current = null;
    setGroups(pending.previousGroups);
    setShowUndoToast(false);
  }

  // Fully-checked groups sink to the bottom, keeping still-needed items in view.
  function sortGroups(groupsToSort: typeof groups) {
    return [...groupsToSort].sort((a, b) => {
      const aDone = a.lines.every((l) => l.checked);
      const bDone = b.lines.every((l) => l.checked);
      return aDone === bDone ? 0 : aDone ? 1 : -1;
    });
  }

  function renderGroup(group: (typeof groups)[number]) {
    const sortedLines = [...group.lines].sort((a, b) => (a.checked === b.checked ? 0 : a.checked ? 1 : -1));
    return (
      <div key={group.name} className="rounded-xl border-2 border-accent-200 bg-surface px-4 py-3 shadow-sm">
        <span className="font-serif text-lg font-medium capitalize text-ink">{group.name}</span>
        <ul className="mt-1 flex flex-col gap-1">
          {sortedLines.map((line) => (
            <li key={line.itemIds.join(",")} className="flex items-center gap-2">
              <label className="flex flex-1 items-center gap-2">
                <input
                  type="checkbox"
                  checked={line.checked}
                  onChange={() => handleToggleLine(line.itemIds, line.checked)}
                />
                <span className={line.checked ? "text-ink/40 line-through" : "text-ink/80"}>
                  {line.approx && "≈ "}
                  {[line.qty, line.unit].filter(Boolean).join(" ")}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const toBuy = groups.filter((g) => !g.inPantry);
  const inPantry = groups.filter((g) => g.inPantry);

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <Link
        to="/grocery"
        className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
      >
        ← Your grocery lists
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
                setName(list.name);
              }}
              className="text-sm text-ink/50 hover:text-ink"
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">{list.name}</h1>
            <div className="flex gap-3">
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
            </div>
          </>
        )}
      </div>

      {!list.isOwner && list.canManage && (
        <p className="mt-3 rounded-lg bg-accent-50 px-3 py-2 text-sm font-medium text-accent-700">
          Viewing as admin: you aren't the owner of this grocery list.
        </p>
      )}

      <form onSubmit={handleAddItem} className="mt-6 flex flex-wrap gap-2">
        <input
          className="w-20 rounded-lg border border-accent-100 px-2 py-1 focus:border-accent-400 focus:outline-none"
          placeholder="qty"
          value={itemQty}
          onChange={(e) => setItemQty(e.target.value)}
        />
        <input
          className="w-24 rounded-lg border border-accent-100 px-2 py-1 focus:border-accent-400 focus:outline-none"
          placeholder="unit"
          value={itemUnit}
          onChange={(e) => setItemUnit(e.target.value)}
        />
        <input
          className="min-w-[10rem] flex-1 rounded-lg border border-accent-100 px-2 py-1 focus:border-accent-400 focus:outline-none"
          placeholder="item"
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
        />
        <button
          type="submit"
          disabled={adding || !itemName.trim()}
          className="rounded-lg bg-accent-600 px-3 py-1 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {groups.length === 0 ? (
        <p className="mt-6 text-ink/60">No items yet. Add a recipe or an item above.</p>
      ) : (
        <div className="mt-6 flex flex-col gap-8">
          <section>
            <h2 className="font-serif text-xl font-semibold text-ink">Shopping list</h2>
            {toBuy.length === 0 ? (
              <p className="mt-3 text-ink/60">Everything on this list is already in your pantry!</p>
            ) : (
              <div className="mt-3 flex flex-col gap-4">{sortGroups(toBuy).map(renderGroup)}</div>
            )}
          </section>

          {inPantry.length > 0 && (
            <section>
              <h2 className="font-serif text-xl font-semibold text-ink">Already in your pantry</h2>
              <div className="mt-3 flex flex-col gap-4">{sortGroups(inPantry).map(renderGroup)}</div>
            </section>
          )}
        </div>
      )}

      {groups.some((g) => g.lines.some((l) => l.checked)) && (
        <button
          type="button"
          onClick={handleAddCheckedToPantry}
          className="mt-4 text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          Add checked items to pantry
        </button>
      )}

      {showUndoToast && (
        <Toast message="Ingredients added to pantry." actionLabel="Undo" onAction={handleUndoAddToPantry} />
      )}
    </div>
  );
}
