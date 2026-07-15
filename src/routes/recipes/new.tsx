import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createRecipe } from "#/recipes/recipes.functions";
import { getSessionUser } from "#/auth/auth.functions";
import { visibilityValues } from "#/db/schema";
import type { Visibility } from "#/db/schema";

export const Route = createFileRoute("/recipes/new")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
  },
  component: NewRecipePage,
});

type IngredientRow = { qty: string; unit: string; name: string };

function NewRecipePage() {
  const navigate = useNavigate();
  const createRecipeFn = useServerFn(createRecipe);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [ingredients, setIngredients] = useState<IngredientRow[]>([{ qty: "", unit: "", name: "" }]);
  const [steps, setSteps] = useState<string[]>([""]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateIngredient(index: number, field: keyof IngredientRow, value: string) {
    setIngredients((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function updateStep(index: number, value: string) {
    setSteps((rows) => rows.map((row, i) => (i === index ? value : row)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setSubmitting(true);
    try {
      const recipe = await createRecipeFn({
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          photoUrl: photoUrl.trim() || undefined,
          visibility,
          ingredients: ingredients
            .filter((row) => row.name.trim())
            .map((row) => ({ qty: row.qty.trim(), unit: row.unit.trim(), name: row.name.trim() })),
          steps: steps.map((s) => s.trim()).filter(Boolean),
          tags: tagsInput
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        },
      });
      await navigate({ to: "/recipes/$recipeId", params: { recipeId: recipe.id } });
    } catch {
      setError("Could not save this recipe. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">New recipe</h1>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
        <label className="flex flex-col gap-1">
          <span className="font-medium">Title</span>
          <input
            className="rounded border px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Grandma's pancakes"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium">Description</span>
          <textarea
            className="rounded border px-3 py-2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium">Photo URL</span>
          <input
            className="rounded border px-3 py-2"
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
            placeholder="https://..."
          />
        </label>

        <div className="flex flex-col gap-2">
          <span className="font-medium">Ingredients</span>
          {ingredients.map((row, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="w-20 rounded border px-2 py-1"
                placeholder="qty"
                value={row.qty}
                onChange={(e) => updateIngredient(i, "qty", e.target.value)}
              />
              <input
                className="w-24 rounded border px-2 py-1"
                placeholder="unit"
                value={row.unit}
                onChange={(e) => updateIngredient(i, "unit", e.target.value)}
              />
              <input
                className="flex-1 rounded border px-2 py-1"
                placeholder="ingredient"
                value={row.name}
                onChange={(e) => updateIngredient(i, "name", e.target.value)}
              />
              <button
                type="button"
                className="px-2 text-red-600"
                onClick={() => setIngredients((rows) => rows.filter((_, idx) => idx !== i))}
                aria-label="Remove ingredient"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="self-start text-sm text-blue-600"
            onClick={() => setIngredients((rows) => [...rows, { qty: "", unit: "", name: "" }])}
          >
            + Add ingredient
          </button>
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-medium">Steps</span>
          {steps.map((step, i) => (
            <div key={i} className="flex gap-2">
              <span className="pt-2 text-sm text-gray-500">{i + 1}.</span>
              <textarea
                className="flex-1 rounded border px-2 py-1"
                value={step}
                onChange={(e) => updateStep(i, e.target.value)}
                rows={2}
              />
              <button
                type="button"
                className="px-2 text-red-600"
                onClick={() => setSteps((rows) => rows.filter((_, idx) => idx !== i))}
                aria-label="Remove step"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            className="self-start text-sm text-blue-600"
            onClick={() => setSteps((rows) => [...rows, ""])}
          >
            + Add step
          </button>
        </div>

        <label className="flex flex-col gap-1">
          <span className="font-medium">Tags (comma separated)</span>
          <input
            className="rounded border px-3 py-2"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="breakfast, quick"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-medium">Visibility</span>
          <select
            className="rounded border px-3 py-2"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
          >
            {visibilityValues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>

        {error && <p className="text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save recipe"}
        </button>
      </form>
    </div>
  );
}
