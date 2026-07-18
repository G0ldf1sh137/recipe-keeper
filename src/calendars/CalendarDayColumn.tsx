import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CalendarEntryRow } from "#/calendars/CalendarEntryRow";
import type { DayOfWeek } from "#/db/schema";

export function CalendarDayColumn({
  day,
  dayLabel,
  entries,
  totals,
  canManage,
  onRemove,
}: {
  day: DayOfWeek;
  dayLabel: string;
  entries: { entryId: string; recipeId: string; title: string; dayOfWeek: DayOfWeek }[];
  totals: { calories: number; protein: number; carbs: number; fat: number; incomplete: boolean };
  canManage: boolean;
  onRemove: (entryId: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: day });

  const macroParts = [
    totals.calories ? `${totals.calories} cal` : null,
    totals.protein ? `${totals.protein}g protein` : null,
    totals.carbs ? `${totals.carbs}g carbs` : null,
    totals.fat ? `${totals.fat}g fat` : null,
  ].filter(Boolean);

  return (
    <div ref={setNodeRef} className="rounded-xl border-2 border-accent-200 bg-surface p-3">
      <h2 className="font-serif text-sm font-semibold text-ink">{dayLabel}</h2>
      {entries.length > 0 && macroParts.length > 0 && (
        <p
          className="mt-1 text-xs text-ink/60"
          title={totals.incomplete ? "Some recipes this day are missing nutrition info" : undefined}
        >
          {totals.incomplete ? "~" : ""}
          {macroParts.join(" · ")}
        </p>
      )}
      <SortableContext items={entries.map((e) => e.entryId)} strategy={verticalListSortingStrategy}>
        {entries.length === 0 ? (
          <p className="mt-2 text-xs text-ink/40">No recipes</p>
        ) : (
          <ul className="mt-2 flex flex-col gap-2">
            {entries.map((entry) => (
              <CalendarEntryRow key={entry.entryId} entry={entry} canManage={canManage} onRemove={onRemove} />
            ))}
          </ul>
        )}
      </SortableContext>
    </div>
  );
}
