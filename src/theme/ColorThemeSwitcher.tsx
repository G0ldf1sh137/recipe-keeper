import { useState } from "react";
import { COLOR_THEME_COOKIE, colorThemeValues } from "./theme.functions";
import type { ColorTheme } from "./theme.functions";

function applyColorTheme(theme: ColorTheme) {
  if (theme === "warm") {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = theme;
  }
}

const labels: Record<ColorTheme, string> = {
  warm: "Warm",
  ocean: "Ocean",
  forest: "Forest",
  berry: "Berry",
  slate: "Slate",
};

export function ColorThemeSwitcher({ initialColorTheme }: { initialColorTheme: ColorTheme }) {
  const [colorTheme, setColorTheme] = useState(initialColorTheme);

  function selectColorTheme(next: ColorTheme) {
    setColorTheme(next);
    applyColorTheme(next);
    document.cookie = `${COLOR_THEME_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }

  return (
    <div className="flex flex-wrap rounded-full border-2 border-accent-200 p-0.5 text-xs">
      {colorThemeValues.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => selectColorTheme(value)}
          aria-pressed={colorTheme === value}
          className={
            colorTheme === value
              ? "rounded-full bg-accent-600 px-2.5 py-1 font-medium text-white"
              : "rounded-full px-2.5 py-1 font-medium text-ink/60 hover:text-ink"
          }
        >
          {labels[value]}
        </button>
      ))}
    </div>
  );
}
