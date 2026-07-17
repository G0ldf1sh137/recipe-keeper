export function RecipeCardSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-xl border-2 border-accent-200 bg-surface px-4 py-3 shadow-sm">
      <div className="h-14 w-14 shrink-0 rounded-lg bg-accent-100" />
      <div className="min-w-0 flex-1">
        <div className="h-5 w-2/3 rounded bg-accent-100" />
        <div className="mt-2 h-3 w-1/3 rounded bg-accent-100" />
      </div>
    </div>
  );
}
