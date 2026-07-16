import { Link } from "@tanstack/react-router";
import { Stars } from "#/ratings/RecipeRating";

type RecipeCardProps = {
  recipe: { id: string; title: string; visibility: string; tags: string[] };
  rating?: { average: number; count: number };
};

export function RecipeCard({ recipe, rating }: RecipeCardProps) {
  return (
    <Link
      to="/recipes/$recipeId"
      params={{ recipeId: recipe.id }}
      className="block rounded-xl border border-accent-100 bg-surface px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="font-serif text-lg font-medium text-ink">{recipe.title}</span>
        <span className="text-xs font-medium uppercase tracking-wide text-ink/40">
          {recipe.visibility}
        </span>
      </div>
      {rating && (
        <div className="mt-1 flex items-center gap-1.5">
          <Stars value={rating.average} size={14} />
          <span className="text-xs text-ink/50">
            {rating.average.toFixed(1)} ({rating.count})
          </span>
        </div>
      )}
      {recipe.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-accent-50 px-2 py-0.5 text-xs text-ink/70">
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
