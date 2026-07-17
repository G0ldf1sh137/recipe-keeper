import { useState } from "react";

export function TagInput({
  value,
  onChange,
  knownTagNames,
  placeholder,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
  knownTagNames: string[];
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const tag = raw.trim().toLowerCase();
    if (!tag || value.includes(tag)) return;
    onChange([...value, tag]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      commit(draft);
      setDraft("");
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  }

  function removeTag(tag: string) {
    onChange(value.filter((t) => t !== tag));
  }

  const suggestions = draft.trim()
    ? knownTagNames.filter((name) => name.includes(draft.trim().toLowerCase()) && !value.includes(name)).slice(0, 6)
    : [];

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-accent-100 px-2 py-1.5 focus-within:border-accent-400">
        {value.map((tag) => (
          <span
            key={tag}
            className="flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-xs text-ink/70"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
              className="text-ink/40 hover:text-ink"
            >
              ✕
            </button>
          </span>
        ))}
        <input
          className="min-w-[8rem] flex-1 border-none px-1 py-0.5 text-sm focus:outline-none"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
      </div>
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => {
                commit(name);
                setDraft("");
              }}
              className="rounded-full border border-accent-200 px-2 py-0.5 text-xs text-ink/60 hover:bg-accent-50"
            >
              + {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
