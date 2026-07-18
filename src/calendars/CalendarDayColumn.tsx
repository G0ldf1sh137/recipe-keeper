import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CalendarEntryRow } from "#/calendars/CalendarEntryRow";
import type { DayOfWeek } from "#/db/schema";

export function CalendarDayColumn({
  day,
  dayLabel,
  entries,
  canManage,
  onRemove,
}: {
  day: DayOfWeek;
  dayLabel: string;
  entries: { entryId: string; recipeId: string; title: string; dayOfWeek: DayOfWeek }[];
  canManage: boolean;
  onRemove: (entryId: string) => void;
}) {
  const { setNodeRef } = useDroppable({ id: day });

  return (
    <div ref={setNodeRef} className="rounded-xl border-2 border-accent-200 bg-surface p-3">
      <h2 className="font-serif text-sm font-semibold text-ink">{dayLabel}</h2>
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
