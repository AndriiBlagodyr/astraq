"use client";

import { IconButton, useTheme, type ThemeName } from "@astraq/ui";
import { MoonStar, Palette, SunMedium } from "lucide-react";

type ThemeToggleProps = {
  className?: string;
};

const themeOrder: ThemeName[] = ["astraq", "terminal", "midnight"];

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { mode, theme, setTheme, toggleMode } = useTheme();
  const isDark = mode === "dark";
  const nextColorScheme = isDark ? "light" : "dark";
  const nextTheme =
    themeOrder[(themeOrder.indexOf(theme) + 1) % themeOrder.length];

  return (
    <div
      className={`inline-flex items-center gap-2 ${className ?? ""}`}
      aria-label="Theme controls"
    >
      <IconButton
        label={`Switch to ${nextColorScheme} mode`}
        variant="secondary"
        onClick={toggleMode}
      >
        {isDark ? (
          <MoonStar className="size-4" strokeWidth={1.8} />
        ) : (
          <SunMedium className="size-4" strokeWidth={1.8} />
        )}
      </IconButton>
      <IconButton
        label={`Current theme: ${theme}. Switch to ${nextTheme}`}
        variant="secondary"
        onClick={() => setTheme(nextTheme)}
      >
        <Palette className="size-4" strokeWidth={1.8} />
      </IconButton>
    </div>
  );
}
