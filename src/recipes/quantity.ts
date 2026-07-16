export type Fraction = { num: bigint; den: bigint };

function gcd(a: bigint, b: bigint): bigint {
  a = a < 0n ? -a : a;
  b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a === 0n ? 1n : a;
}

export function reduceFraction(f: Fraction): Fraction {
  const divisor = gcd(f.num, f.den);
  return { num: f.num / divisor, den: f.den / divisor };
}

// Parses whole numbers ("2"), decimals ("1.5"), simple fractions ("3/4"), and
// mixed numbers ("1 1/2"). Anything else (e.g. "pinch", "to taste") is not
// summable/scalable and returns undefined.
export function parseQuantity(raw: string): Fraction | undefined {
  const qty = raw.trim();
  if (qty === "") return undefined;

  const mixedMatch = /^(\d+)\s+(\d+)\/(\d+)$/.exec(qty);
  if (mixedMatch) {
    const den = BigInt(mixedMatch[3]);
    if (den === 0n) return undefined;
    const whole = BigInt(mixedMatch[1]);
    const num = BigInt(mixedMatch[2]);
    return reduceFraction({ num: whole * den + num, den });
  }

  const fractionMatch = /^(\d+)\/(\d+)$/.exec(qty);
  if (fractionMatch) {
    const den = BigInt(fractionMatch[2]);
    if (den === 0n) return undefined;
    return reduceFraction({ num: BigInt(fractionMatch[1]), den });
  }

  if (/^\d+(\.\d+)?$/.test(qty)) {
    const [wholePart, fractionPart = ""] = qty.split(".");
    const den = 10n ** BigInt(fractionPart.length);
    const num = BigInt(wholePart + fractionPart);
    return reduceFraction({ num, den });
  }

  return undefined;
}

export function addFractions(a: Fraction, b: Fraction): Fraction {
  return reduceFraction({ num: a.num * b.den + b.num * a.den, den: a.den * b.den });
}

export function multiplyFraction(a: Fraction, b: Fraction): Fraction {
  return reduceFraction({ num: a.num * b.num, den: a.den * b.den });
}

export function formatFraction(f: Fraction): string {
  const { num, den } = reduceFraction(f);
  if (den === 1n) return num.toString();
  const whole = num / den;
  const remainder = num % den;
  if (whole === 0n) return `${remainder}/${den}`;
  return `${whole} ${remainder}/${den}`;
}

// Scales a stored ingredient quantity by `factor`. Quantities that aren't
// parseable (e.g. "pinch") are returned unchanged at any scale.
export function scaleQuantity(raw: string, factor: Fraction): string {
  const parsed = parseQuantity(raw);
  if (!parsed) return raw;
  return formatFraction(multiplyFraction(parsed, factor));
}
