import { Link } from "@tanstack/react-router";
import { Stars } from "#/ratings/RecipeRating";

type RecipeCardProps = {
  recipe: {
    id: string;
    title: string;
    visibility: string;
    tags: string[];
    photoUrls: string[];
    coverPhotoUrl: string | null;
  };
  rating?: { average: number; count: number };
  onHide?: () => void;
};

export function RecipeCard({ recipe, rating, onHide }: RecipeCardProps) {
  const imageUrl = recipe.coverPhotoUrl ?? recipe.photoUrls[0];

  return (
    <div className="flex items-center gap-3 rounded-xl border-2 border-accent-200 bg-surface px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      {imageUrl && (
        <Link to="/recipes/$recipeId" params={{ recipeId: recipe.id }} className="shrink-0">
          <img src={imageUrl} alt="" loading="lazy" className="h-14 w-14 rounded-lg object-cover" />
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <Link to="/recipes/$recipeId" params={{ recipeId: recipe.id }} className="block">
          <div className="flex items-center justify-between gap-2">
            <span className="font-serif text-lg font-medium text-ink">{recipe.title}</span>
            <span className="flex shrink-0 items-center gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-ink/40">
                {recipe.visibility}
              </span>
              {onHide && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onHide();
                  }}
                  aria-label="Hide this recipe"
                  title="Not interested"
                  className="flex h-5 w-5 items-center justify-center rounded-full text-ink/40 hover:bg-accent-100 hover:text-ink/70"
                >
                  ×
                </button>
              )}
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
        </Link>
        {recipe.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {recipe.tags.map((tag) => (
              <Link
                key={tag}
                to="/recipes"
                search={{ q: tag }}
                className="rounded-full bg-accent-50 px-2 py-0.5 text-xs text-ink/70 hover:bg-accent-100"
              >
                {tag}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
