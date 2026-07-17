import { scaleLabels } from "./useRecipeScale";
import type { ScalePreset } from "./useRecipeScale";

export function ScaleToggle({
  scale,
  onScaleChange,
  customInput,
  onCustomInputChange,
}: {
  scale: ScalePreset;
  onScaleChange: (scale: ScalePreset) => void;
  customInput: string;
  onCustomInputChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-full border-2 border-accent-200 p-0.5 text-xs">
        {(Object.keys(scaleLabels) as ScalePreset[]).map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onScaleChange(value)}
            aria-pressed={scale === value}
            className={
              scale === value
                ? "rounded-full bg-accent-600 px-2.5 py-1 font-medium text-white"
                : "rounded-full px-2.5 py-1 font-medium text-ink/60 hover:text-ink"
            }
          >
            {scaleLabels[value]}
          </button>
        ))}
      </div>
      {scale === "custom" && (
        <input
          value={customInput}
          onChange={(e) => onCustomInputChange(e.target.value)}
          placeholder="e.g. 1.5 or 3/4"
          className="w-28 rounded-lg border border-accent-100 px-2 py-1 text-xs focus:border-accent-400 focus:outline-none"
        />
      )}
    </div>
  );
}
