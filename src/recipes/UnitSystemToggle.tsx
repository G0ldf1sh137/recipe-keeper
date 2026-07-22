import { unitSystemLabels } from "./useUnitSystem";
import type { UnitSystemPreset } from "./useUnitSystem";

export function UnitSystemToggle({
  system,
  onSystemChange,
}: {
  system: UnitSystemPreset;
  onSystemChange: (system: UnitSystemPreset) => void;
}) {
  return (
    <div className="flex rounded-full border-2 border-accent-200 p-0.5 text-xs">
      {(Object.keys(unitSystemLabels) as UnitSystemPreset[]).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onSystemChange(value)}
          aria-pressed={system === value}
          className={
            system === value
              ? "rounded-full bg-accent-600 px-2.5 py-1 font-medium text-white"
              : "rounded-full px-2.5 py-1 font-medium text-ink/60 hover:text-ink"
          }
        >
          {unitSystemLabels[value]}
        </button>
      ))}
    </div>
  );
}
