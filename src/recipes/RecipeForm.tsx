import { useState } from "react";
import { visibilityValues } from "#/db/schema";
import type { Visibility } from "#/db/schema";
import { MultiImageUpload } from "#/uploads/ImageUpload";

export type IngredientRow = { qty: string; unit: string; name: string };
export type StepRow = { text: string; imageUrls: string[] };

export type RecipeFormValues = {
  title: string;
  description: string;
  photoUrls: string[];
  tagsInput: string;
  visibility: Visibility;
  ingredients: IngredientRow[];
  steps: StepRow[];
};

export type RecipeFormSubmitValues = {
  title: string;
  description?: string;
  photoUrls: string[];
  visibility: Visibility;
  ingredients: IngredientRow[];
  steps: StepRow[];
  tags: string[];
};

export function emptyRecipeFormValues(): RecipeFormValues {
  return {
    title: "",
    description: "",
    photoUrls: [],
    tagsInput: "",
    visibility: "private",
    ingredients: [{ qty: "", unit: "", name: "" }],
    steps: [{ text: "", imageUrls: [] }],
  };
}

const inputClass =
  "rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none";

export function RecipeForm({
  initialValues,
  submitLabel,
  onSubmit,
  onPhotoUrlsChange,
  knownIngredientNames = [],
  knownUnitNames = [],
}: {
  initialValues: RecipeFormValues;
  submitLabel: string;
  onSubmit: (values: RecipeFormSubmitValues) => Promise<void>;
  onPhotoUrlsChange?: (urls: string[]) => void;
  knownIngredientNames?: string[];
  knownUnitNames?: string[];
}) {
  const [title, setTitle] = useState(initialValues.title);
  const [description, setDescription] = useState(initialValues.description);
  const [photoUrls, setPhotoUrls] = useState<string[]>(initialValues.photoUrls);

  function updatePhotoUrls(urls: string[]) {
    setPhotoUrls(urls);
    onPhotoUrlsChange?.(urls);
  }
  const [tagsInput, setTagsInput] = useState(initialValues.tagsInput);
  const [visibility, setVisibility] = useState<Visibility>(initialValues.visibility);
  const [ingredients, setIngredients] = useState<IngredientRow[]>(initialValues.ingredients);
  const [steps, setSteps] = useState<StepRow[]>(initialValues.steps);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateIngredient(index: number, field: keyof IngredientRow, value: string) {
    setIngredients((rows) => rows.map((row, i) => (i === index ? { ...row, [field]: value } : row)));
  }

  function updateStep(index: number, changes: Partial<StepRow>) {
    setSteps((rows) => rows.map((row, i) => (i === index ? { ...row, ...changes } : row)));
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
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        photoUrls,
        visibility,
        ingredients: ingredients
          .filter((row) => row.name.trim())
          .map((row) => ({ qty: row.qty.trim(), unit: row.unit.trim(), name: row.name.trim() })),
        steps: steps
          .filter((row) => row.text.trim())
          .map((row) => ({ text: row.text.trim(), imageUrls: row.imageUrls })),
        tags: tagsInput
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });
    } catch {
      setError("Could not save this recipe. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-6">
      <label className="flex flex-col gap-1">
        <span className="font-medium text-ink/70">Title</span>
        <input
          className={inputClass}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Grandma's pancakes"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-medium text-ink/70">Description</span>
        <textarea
          className={inputClass}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="font-medium text-ink/70">Photos</span>
        <MultiImageUpload
          imageUrls={photoUrls}
          onChange={updatePhotoUrls}
          previewClassName="h-32 w-48 rounded-lg object-cover"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-medium text-ink/70">Ingredients</span>
        {ingredients.map((row, i) => (
          <div key={i} className="flex flex-wrap gap-2">
            <input
              className={`w-20 ${inputClass} px-2 py-1`}
              placeholder="qty"
              value={row.qty}
              onChange={(e) => updateIngredient(i, "qty", e.target.value)}
            />
            <input
              className={`w-24 ${inputClass} px-2 py-1`}
              placeholder="unit"
              value={row.unit}
              onChange={(e) => updateIngredient(i, "unit", e.target.value)}
              list="unit-names"
            />
            <input
              className={`min-w-[10rem] flex-1 ${inputClass} px-2 py-1`}
              placeholder="ingredient"
              value={row.name}
              onChange={(e) => updateIngredient(i, "name", e.target.value)}
              list="ingredient-names"
            />
            <button
              type="button"
              className="px-2 text-red-600 hover:text-red-700"
              onClick={() => setIngredients((rows) => rows.filter((_, idx) => idx !== i))}
              aria-label="Remove ingredient"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="self-start text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          onClick={() => setIngredients((rows) => [...rows, { qty: "", unit: "", name: "" }])}
        >
          + Add ingredient
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <span className="font-medium text-ink/70">Steps</span>
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-accent-100 p-3">
            <div className="flex gap-2">
              <span className="pt-2 text-sm text-ink/40">{i + 1}.</span>
              <textarea
                className={`flex-1 ${inputClass} px-2 py-1`}
                value={step.text}
                onChange={(e) => updateStep(i, { text: e.target.value })}
                rows={2}
              />
              <button
                type="button"
                className="px-2 text-red-600 hover:text-red-700"
                onClick={() => setSteps((rows) => rows.filter((_, idx) => idx !== i))}
                aria-label="Remove step"
              >
                ✕
              </button>
            </div>
            <div className="pl-6">
              <MultiImageUpload
                imageUrls={step.imageUrls}
                onChange={(urls) => updateStep(i, { imageUrls: urls })}
                label="Add step photos"
                previewClassName="h-16 w-16 rounded-lg object-cover"
              />
            </div>
          </div>
        ))}
        <button
          type="button"
          className="self-start text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          onClick={() => setSteps((rows) => [...rows, { text: "", imageUrls: [] }])}
        >
          + Add step
        </button>
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-medium text-ink/70">Tags (comma separated)</span>
        <input
          className={inputClass}
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder="breakfast, quick"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-medium text-ink/70">Visibility</span>
        <select
          className={inputClass}
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
        className="self-start rounded-lg bg-accent-600 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
      >
        {submitting ? "Saving..." : submitLabel}
      </button>

      <datalist id="ingredient-names">
        {knownIngredientNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <datalist id="unit-names">
        {knownUnitNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </form>
  );
}
