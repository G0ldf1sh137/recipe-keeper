import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

export const themeValues = ["light", "system", "dark"] as const;
export type ThemePreference = (typeof themeValues)[number];

export const THEME_COOKIE = "theme";

export const getThemePreference = createServerFn({ method: "GET" }).handler(async () => {
  const header = getRequestHeader("cookie");
  const match = header?.match(/(?:^|;\s*)theme=([^;]*)/);
  const value = match ? decodeURIComponent(match[1]) : undefined;
  return (themeValues as readonly string[]).includes(value ?? "") ? (value as ThemePreference) : "system";
});
