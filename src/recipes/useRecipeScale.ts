import { useState } from "react";
import { parseQuantity } from "./quantity";
import type { Fraction } from "./quantity";

export type ScalePreset = "0.5" | "1" | "2" | "custom";

export const scaleLabels: Record<ScalePreset, string> = {
  "0.5": "0.5x",
  "1": "1x",
  "2": "2x",
  custom: "Custom",
};

export const presetFactors: Record<Exclude<ScalePreset, "custom">, Fraction> = {
  "0.5": { num: 1n, den: 2n },
  "1": { num: 1n, den: 1n },
  "2": { num: 2n, den: 1n },
};

export function useRecipeScale() {
  const [scale, setScale] = useState<ScalePreset>("1");
  const [customInput, setCustomInput] = useState("1");
  const [customFactor, setCustomFactor] = useState<Fraction>({ num: 1n, den: 1n });

  const activeFactor = scale === "custom" ? customFactor : presetFactors[scale];
  const isUnscaled = activeFactor.num === activeFactor.den;

  function handleCustomInputChange(value: string) {
    setCustomInput(value);
    const parsed = parseQuantity(value);
    if (parsed) setCustomFactor(parsed);
  }

  return { scale, setScale, customInput, handleCustomInputChange, activeFactor, isUnscaled };
}
