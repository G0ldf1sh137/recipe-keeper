import { useEffect, useRef, useState } from "react";

export function DropdownButton({
  label,
  icon,
  badge,
  children,
  iconOnly = false,
  disabled = false,
}: {
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  children: React.ReactNode;
  iconOnly?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-label={iconOnly ? label : undefined}
        title={iconOnly ? label : undefined}
        className={
          iconOnly
            ? "flex items-center rounded-lg border-2 border-accent-300 p-1.5 text-ink hover:bg-accent-50 disabled:opacity-50"
            : "flex items-center gap-1.5 rounded-lg border-2 border-accent-300 px-3 py-1.5 text-sm font-medium text-ink hover:bg-accent-50 disabled:opacity-50"
        }
      >
        {icon}
        {!iconOnly && label}
        {!!badge && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-600 px-1 text-xs font-bold text-white">
            {badge}
          </span>
        )}
      </button>
      {open && (
        <div
          className={`absolute z-10 mt-2 w-72 rounded-lg border-2 border-accent-200 bg-paper p-3 shadow-lg ${iconOnly ? "right-0" : ""}`}
        >
          {children}
        </div>
      )}
    </div>
  );
}
