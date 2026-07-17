import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { saveMyNote } from "./notes.functions";

export function NoteEditor({
  recipeId,
  initialText,
  canEdit,
}: {
  recipeId: string;
  initialText: string;
  canEdit: boolean;
}) {
  const saveFn = useServerFn(saveMyNote);
  const [text, setText] = useState(initialText);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await saveFn({ data: { recipeId, text } });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return (
      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold text-ink">My notes</h2>
        <p className="mt-3 text-sm text-ink/60">
          <a
            href="/auth/google"
            className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            Sign in with Google
          </a>{" "}
          to add a note.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="font-serif text-xl font-semibold text-ink">My notes</h2>
      <p className="mt-1 text-sm text-ink/50">Only visible to you.</p>
      <textarea
        className="mt-3 w-full rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
        rows={3}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        placeholder="e.g. used less salt, double the garlic..."
        maxLength={2000}
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save note"}
        </button>
        {saved && <span className="text-sm text-ink/50">Saved.</span>}
      </div>
    </section>
  );
}
