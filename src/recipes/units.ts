import { parseQuantity } from "./quantity";
import type { Fraction } from "./quantity";

export type UnitType = "volume" | "weight";
export type UnitSystem = "us" | "metric";

type UnitDef = { type: UnitType; toBase: number; aliases: string[] };

// toBase: multiplying an amount in this unit gives the amount in the type's
// base unit — mL for volume, g for weight.
const UNIT_DEFS: Record<string, UnitDef> = {
  tsp: { type: "volume", toBase: 4.92892, aliases: ["tsp", "tsps", "teaspoon", "teaspoons"] },
  tbsp: { type: "volume", toBase: 14.7868, aliases: ["tbsp", "tbsps", "tablespoon", "tablespoons"] },
  "fl oz": { type: "volume", toBase: 29.5735, aliases: ["fl oz", "fl. oz", "fluid ounce", "fluid ounces"] },
  cup: { type: "volume", toBase: 236.588, aliases: ["cup", "cups"] },
  pint: { type: "volume", toBase: 473.176, aliases: ["pint", "pints", "pt"] },
  quart: { type: "volume", toBase: 946.353, aliases: ["quart", "quarts", "qt"] },
  gallon: { type: "volume", toBase: 3785.41, aliases: ["gallon", "gallons", "gal"] },
  mL: { type: "volume", toBase: 1, aliases: ["ml", "milliliter", "milliliters", "millilitre", "millilitres"] },
  L: { type: "volume", toBase: 1000, aliases: ["l", "liter", "liters", "litre", "litres"] },
  g: { type: "weight", toBase: 1, aliases: ["g", "gram", "grams"] },
  kg: { type: "weight", toBase: 1000, aliases: ["kg", "kilogram", "kilograms"] },
  oz: { type: "weight", toBase: 28.3495, aliases: ["oz", "ounce", "ounces"] },
  lb: { type: "weight", toBase: 453.592, aliases: ["lb", "lbs", "pound", "pounds"] },
};

const ALIAS_TO_CANONICAL: Record<string, string> = {};
for (const [canonical, def] of Object.entries(UNIT_DEFS)) {
  for (const alias of def.aliases) ALIAS_TO_CANONICAL[alias] = canonical;
}

function cleanUnitText(raw: string): string {
  return raw.trim().toLowerCase().replace(/\.+$/, "");
}

export function normalizeUnit(raw: string): { canonical: string; type: UnitType; toBase: number } | undefined {
  const canonical = ALIAS_TO_CANONICAL[cleanUnitText(raw)];
  if (!canonical) return undefined;
  const def = UNIT_DEFS[canonical];
  return { canonical, type: def.type, toBase: def.toBase };
}

// Approximate densities (grams per mL) for common cooking/baking ingredients,
// used only to bridge volume<->weight — a guess, unlike same-type conversion,
// so every caller must mark results using it as approximate. `preferVolume`
// ingredients (things that pour) stay in volume when converting to Metric,
// since that's how metric recipes conventionally measure them even though a
// density is known — cross-type conversion is reserved for the dry/solid
// ingredients where metric recipes conventionally switch to weight.
type DensityEntry = { gPerMl: number; preferVolume?: boolean };

const DENSITY_TABLE: Record<string, DensityEntry> = {
  water: { gPerMl: 1.0, preferVolume: true },
  milk: { gPerMl: 1.03, preferVolume: true },
  cream: { gPerMl: 1.01, preferVolume: true },
  "heavy cream": { gPerMl: 1.01, preferVolume: true },
  oil: { gPerMl: 0.92, preferVolume: true },
  "vegetable oil": { gPerMl: 0.92, preferVolume: true },
  "olive oil": { gPerMl: 0.92, preferVolume: true },
  honey: { gPerMl: 1.42, preferVolume: true },
  "maple syrup": { gPerMl: 1.37, preferVolume: true },
  flour: { gPerMl: 0.53 },
  "all-purpose flour": { gPerMl: 0.53 },
  "bread flour": { gPerMl: 0.53 },
  "cake flour": { gPerMl: 0.45 },
  "whole wheat flour": { gPerMl: 0.55 },
  sugar: { gPerMl: 0.85 },
  "granulated sugar": { gPerMl: 0.85 },
  "brown sugar": { gPerMl: 0.93 },
  "powdered sugar": { gPerMl: 0.56 },
  "confectioners sugar": { gPerMl: 0.56 },
  butter: { gPerMl: 0.96 },
  rice: { gPerMl: 0.85 },
  oats: { gPerMl: 0.41 },
  "rolled oats": { gPerMl: 0.41 },
  "cocoa powder": { gPerMl: 0.51 },
  salt: { gPerMl: 1.2 },
  "baking soda": { gPerMl: 0.9 },
  "baking powder": { gPerMl: 0.9 },
  cornstarch: { gPerMl: 0.55 },
  yogurt: { gPerMl: 1.03 },
  "sour cream": { gPerMl: 0.96 },
  "peanut butter": { gPerMl: 1.09 },
  "cream cheese": { gPerMl: 1.02 },
};

// Longest key first, so "all-purpose flour" matches before the generic "flour".
const DENSITY_KEYS = Object.keys(DENSITY_TABLE).sort((a, b) => b.length - a.length);

export function findDensity(ingredientName: string): DensityEntry | undefined {
  const name = ingredientName.trim().toLowerCase();
  for (const key of DENSITY_KEYS) {
    if (name.includes(key)) return DENSITY_TABLE[key];
  }
  return undefined;
}

function fractionToNumber(f: Fraction): number {
  return Number(f.num) / Number(f.den);
}

// Converts an amount from one unit to another. Same-type conversions (e.g.
// cup -> mL) are exact. Cross-type conversions (e.g. cup -> g) require a
// known density for the ingredient and are always marked approximate.
// Returns undefined when either unit doesn't normalize, or when a cross-type
// conversion has no known density — callers should leave the value unchanged
// in that case, the same "can't handle it, don't touch it" fallback
// `parseQuantity`/`scaleQuantity` already use for unparseable quantities.
export function convertQuantity(
  amount: Fraction,
  fromUnit: string,
  toUnit: string,
  ingredientName?: string,
): { value: number; approx: boolean } | undefined {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);
  if (!from || !to) return undefined;

  const amountInFromBase = fractionToNumber(amount) * from.toBase;

  if (from.type === to.type) {
    return { value: amountInFromBase / to.toBase, approx: false };
  }

  const density = ingredientName ? findDensity(ingredientName) : undefined;
  if (!density) return undefined;

  const amountInToBase = from.type === "volume" ? amountInFromBase * density.gPerMl : amountInFromBase / density.gPerMl;
  return { value: amountInToBase / to.toBase, approx: true };
}

// Picks a sensible unit for displaying an amount (already expressed in the
// type's base unit) within a given system, based on magnitude.
export function preferredUnitFor(type: UnitType, system: UnitSystem, amountInBase: number): string {
  if (system === "metric") {
    if (type === "volume") return amountInBase >= 1000 ? "L" : "mL";
    return amountInBase >= 1000 ? "kg" : "g";
  }
  if (type === "volume") {
    if (amountInBase < UNIT_DEFS.tbsp.toBase) return "tsp";
    if (amountInBase < UNIT_DEFS.cup.toBase / 4) return "tbsp";
    return "cup";
  }
  return amountInBase < UNIT_DEFS.lb.toBase ? "oz" : "lb";
}

function formatDecimal(n: number): string {
  return (Math.round(n * 100) / 100).toString();
}

// The single entry point recipe display and grocery merging use: converts a
// stored qty/unit into the nicest unit for the target system. Crosses from
// volume to weight (or back) only when the ingredient's density is known and
// (per `preferVolume`) that's the idiomatic choice for the target system —
// e.g. "1 cup flour" -> Metric shows grams, but "1 cup milk" -> Metric stays
// in mL/L since metric recipes measure pourable liquids by volume too.
export function convertForDisplay(
  qty: string,
  unit: string,
  system: UnitSystem,
  ingredientName?: string,
): { qty: string; unit: string; approx: boolean } | undefined {
  const parsed = parseQuantity(qty);
  const from = normalizeUnit(unit);
  if (!parsed || !from) return undefined;

  const density = ingredientName ? findDensity(ingredientName) : undefined;
  const wantsCrossType =
    density !== undefined &&
    !density.preferVolume &&
    ((system === "metric" && from.type === "volume") || (system === "us" && from.type === "weight"));

  const targetType: UnitType = wantsCrossType ? (from.type === "volume" ? "weight" : "volume") : from.type;
  const amountInFromBase = fractionToNumber(parsed) * from.toBase;
  const amountInTargetBase =
    targetType === from.type
      ? amountInFromBase
      : from.type === "volume"
        ? amountInFromBase * density!.gPerMl
        : amountInFromBase / density!.gPerMl;

  const targetUnit = preferredUnitFor(targetType, system, amountInTargetBase);
  const converted = convertQuantity(parsed, unit, targetUnit, ingredientName);
  if (!converted) return undefined;

  return { qty: formatDecimal(converted.value), unit: targetUnit, approx: converted.approx };
}
