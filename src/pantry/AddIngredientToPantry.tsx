import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Package } from "lucide-react";
import { addPantryItem } from "./pantry.functions";

export function AddIngredientToPantry({
  name,
  initiallyInPantry,
  loading,
}: {
  name: string;
  initiallyInPantry: boolean;
  loading: boolean;
}) {
  const addFn = useServerFn(addPantryItem);
  const [justAdded, setJustAdded] = useState(false);
  const [busy, setBusy] = useState(false);

  const added = justAdded || initiallyInPantry;

  async function handleAdd() {
    setBusy(true);
    try {
      await addFn({ data: { name } });
      setJustAdded(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={busy || loading}
      aria-label="Add to pantry"
      title={added ? "Already in your pantry" : "Add to pantry"}
      className={
        added
          ? "flex items-center rounded-lg border-2 border-accent-600 bg-accent-600 p-1.5 text-white disabled:opacity-50"
          : "flex items-center rounded-lg border-2 border-accent-300 p-1.5 text-ink hover:bg-accent-50 disabled:opacity-50"
      }
    >
      <Package size={14} />
    </button>
  );
}
