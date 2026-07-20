import { useEffect, useState } from "react";
import { Sun, Monitor, Moon } from "lucide-react";
import { THEME_COOKIE, themeValues } from "./theme.functions";
import type { ThemePreference } from "./theme.functions";

function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: ThemePreference) {
  const isDark = theme === "dark" || (theme === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", isDark);
}

const labels: Record<ThemePreference, string> = {
  light: "Light",
  system: "Auto",
  dark: "Dark",
};

const icons: Record<ThemePreference, typeof Sun> = {
  light: Sun,
  system: Monitor,
  dark: Moon,
};

export function ThemeToggle({ initialTheme }: { initialTheme: ThemePreference }) {
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => applyTheme("system");
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [theme]);

  function selectTheme(next: ThemePreference) {
    setTheme(next);
    applyTheme(next);
    document.cookie = `${THEME_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  return (
    <div className="flex rounded-full border-2 border-accent-200 p-0.5 text-xs">
      {themeValues.map((value) => {
        const Icon = icons[value];
        return (
          <button
            key={value}
            type="button"
            onClick={() => selectTheme(value)}
            aria-pressed={theme === value}
            aria-label={labels[value]}
            title={labels[value]}
            className={
              theme === value
                ? "rounded-full bg-accent-600 p-1.5 text-white"
                : "rounded-full p-1.5 text-ink/60 hover:text-ink"
            }
          >
            <Icon size={14} />
          </button>
        );
      })}
    </div>
  );
}
