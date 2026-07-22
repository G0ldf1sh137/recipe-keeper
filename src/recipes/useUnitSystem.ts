import { useState } from "react";

export type UnitSystemPreset = "original" | "us" | "metric";

export const unitSystemLabels: Record<UnitSystemPreset, string> = {
  original: "Original",
  us: "US",
  metric: "Metric",
};

export function useUnitSystem() {
  const [system, setSystem] = useState<UnitSystemPreset>("original");
  return { system, setSystem };
}
