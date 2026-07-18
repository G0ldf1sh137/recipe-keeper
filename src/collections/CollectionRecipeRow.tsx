import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";

const SWIPE_THRESHOLD_RATIO = 0.4;

export function CollectionRecipeRow({
  item,
  canManage,
  onRemove,
}: {
  item: { id: string; title: string };
  canManage: boolean;
  onRemove: (recipeId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const rowRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const movedRef = useRef(false);
  const [dx, setDx] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);

  function handlePointerDown(e: React.PointerEvent) {
    if (!canManage) return;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    movedRef.current = false;
    setIsSwiping(true);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (pointerIdRef.current !== e.pointerId) return;
    const delta = e.clientX - startXRef.current;
    if (Math.abs(delta) > 8) movedRef.current = true;
    setDx(delta);
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (pointerIdRef.current !== e.pointerId) return;
    pointerIdRef.current = null;
    setIsSwiping(false);
    const width = rowRef.current?.offsetWidth ?? 1;
    if (Math.abs(dx) > width * SWIPE_THRESHOLD_RATIO) {
      onRemove(item.id);
      return;
    }
    setDx(0);
  }

  function handleClickCapture(e: React.MouseEvent) {
    if (movedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      movedRef.current = false;
    }
  }

  const interacting = isDragging || isSwiping;

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: [transform ? CSS.Transform.toString(transform) : undefined, dx ? `translateX(${dx}px)` : undefined]
          .filter(Boolean)
          .join(" "),
        transition: interacting ? undefined : transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      className="flex items-center gap-2 rounded-xl border-2 border-accent-200 bg-surface px-2 py-3 shadow-sm"
    >
      {canManage && (
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Reorder"
          className="cursor-grab touch-none px-1 text-ink/40 hover:text-ink active:cursor-grabbing"
        >
          <GripVertical size={18} />
        </button>
      )}
      <div
        ref={rowRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClickCapture={handleClickCapture}
        style={{ touchAction: canManage ? "pan-y" : undefined }}
        className="flex flex-1 items-center justify-between"
      >
        <Link
          to="/recipes/$recipeId"
          params={{ recipeId: item.id }}
          className="font-serif text-lg font-medium text-ink"
        >
          {item.title}
        </Link>
        {canManage && (
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            aria-label="Remove"
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>
    </li>
  );
}
