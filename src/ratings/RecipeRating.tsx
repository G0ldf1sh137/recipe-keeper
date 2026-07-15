import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Star } from "lucide-react";
import { rateRecipe } from "./ratings.functions";

function Stars({
  value,
  size = 20,
  interactive = false,
  onHover,
  onSelect,
}: {
  value: number;
  size?: number;
  interactive?: boolean;
  onHover?: (value: number | null) => void;
  onSelect?: (value: number) => void;
}) {
  return (
    <div className="flex gap-0.5" role={interactive ? "radiogroup" : undefined}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = value >= star - 0.25;
        const icon = (
          <Star
            size={size}
            className={filled ? "fill-accent-600 text-accent-600" : "fill-none text-accent-200"}
          />
        );
        if (!interactive) return <span key={star}>{icon}</span>;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onSelect?.(star)}
            onMouseEnter={() => onHover?.(star)}
            onMouseLeave={() => onHover?.(null)}
            aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
          >
            {icon}
          </button>
        );
      })}
    </div>
  );
}

export function RecipeRating({
  recipeId,
  average,
  count,
  myRating,
  canRate,
}: {
  recipeId: string;
  average: number;
  count: number;
  myRating: number | null;
  canRate: boolean;
}) {
  const router = useRouter();
  const rateRecipeFn = useServerFn(rateRecipe);
  const [hovered, setHovered] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSelect(value: number) {
    setSubmitting(true);
    try {
      await rateRecipeFn({ data: { recipeId, value } });
      await router.invalidate();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="font-serif text-xl font-semibold text-ink">Rating</h2>
      <div className="mt-3 flex items-center gap-2">
        <Stars value={average} />
        <span className="text-sm text-ink/60">
          {count > 0 ? `${average.toFixed(1)} (${count} rating${count === 1 ? "" : "s"})` : "No ratings yet"}
        </span>
      </div>

      {canRate ? (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-ink/70">Your rating:</span>
          <Stars value={hovered ?? myRating ?? 0} interactive onHover={setHovered} onSelect={handleSelect} />
          {submitting && <span className="text-xs text-ink/40">Saving...</span>}
        </div>
      ) : (
        <p className="mt-3 text-sm text-ink/60">
          <a
            href="/auth/google"
            className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            Sign in with Google
          </a>{" "}
          to rate this recipe.
        </p>
      )}
    </section>
  );
}
