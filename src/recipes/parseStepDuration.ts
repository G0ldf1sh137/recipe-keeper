const durationPattern = /(\d+)\s*(?:(?:-|to)\s*(\d+))?\s*(hours?|hrs?|minutes?|mins?|seconds?|secs?)\b/i;

const unitSeconds: Record<string, number> = {
  hour: 3600,
  hours: 3600,
  hr: 3600,
  hrs: 3600,
  minute: 60,
  minutes: 60,
  min: 60,
  mins: 60,
  second: 1,
  seconds: 1,
  sec: 1,
  secs: 1,
};

// Only the first duration-like phrase in the text is used. A range like
// "10-12 minutes" uses the larger number, so the timer errs toward "not done
// yet" rather than telling you it's done before it actually is.
export function parseStepDuration(text: string): number | undefined {
  const match = durationPattern.exec(text);
  if (!match) return undefined;
  const [, first, second, unit] = match;
  const value = second ? Math.max(Number(first), Number(second)) : Number(first);
  const perUnit = unitSeconds[unit.toLowerCase()];
  if (!perUnit) return undefined;
  return value * perUnit;
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
