import { Link } from "@tanstack/react-router";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { DayOfWeek } from "#/db/schema";

export function CalendarEntryRow({
  entry,
  canManage,
  onRemove,
}: {
  entry: { entryId: string; recipeId: string; title: string; dayOfWeek: DayOfWeek };
  canManage: boolean;
  onRemove: (entryId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.entryId,
  });

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: transform ? CSS.Transform.toString(transform) : undefined,
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-start gap-1"
    >
      {canManage && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Reorder"
          className="mt-0.5 shrink-0 cursor-grab touch-none text-ink/40 hover:text-ink active:cursor-grabbing"
        >
          <GripVertical size={14} />
        </button>
      )}
      <Link
        to="/recipes/$recipeId"
        params={{ recipeId: entry.recipeId }}
        className="min-w-0 flex-1 text-sm font-medium text-ink hover:text-accent-600"
      >
        {entry.title}
      </Link>
      {canManage && (
        <button
          type="button"
          onClick={() => onRemove(entry.entryId)}
          aria-label="Remove"
          className="shrink-0 text-base font-medium text-red-600 hover:text-red-700"
        >
          ✕
        </button>
      )}
    </li>
  );
}
