"use client";

import { MoonStar, Palette, SunMedium } from "lucide-react";
import {
  DENSITIES,
  IconButton,
  Menu,
  MenuContent,
  MenuGroupLabel,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuTrigger,
  useTheme,
  type ColorModePreference,
  type DensityPreference,
  type ThemeName,
} from "@astraq/ui";

type ThemeMenuProps = {
  className?: string;
};

const modes: { value: ColorModePreference; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
];

/**
 * The top bar's theme menu (docs/ui-plan.md § App shell, Phase 2): mode,
 * theme identity, and density, as radio groups. It works before sign-in,
 * so it sits in both shells. The button keeps the quick mode toggle: one
 * click flips light and dark, the menu holds the rest.
 */
export function ThemeMenu({ className }: ThemeMenuProps) {
  const {
    mode,
    modePreference,
    theme,
    themes,
    densityPreference,
    setMode,
    setTheme,
    setDensity,
    toggleMode,
  } = useTheme();
  const isDark = mode === "dark";

  return (
    <div
      className={`inline-flex items-center gap-2 ${className ?? ""}`}
      aria-label="Appearance"
    >
      <IconButton
        label={`Switch to ${isDark ? "light" : "dark"} mode`}
        variant="secondary"
        onClick={toggleMode}
      >
        {isDark ? (
          <MoonStar className="size-4" strokeWidth={1.8} />
        ) : (
          <SunMedium className="size-4" strokeWidth={1.8} />
        )}
      </IconButton>
      <Menu>
        <MenuTrigger
          render={
            <IconButton label="Appearance menu" variant="secondary">
              <Palette className="size-4" strokeWidth={1.8} />
            </IconButton>
          }
        />
        <MenuContent align="end" className="min-w-52">
          <MenuRadioGroup
            value={modePreference}
            onValueChange={(value) => setMode(value as ColorModePreference)}
          >
            <MenuGroupLabel>Mode</MenuGroupLabel>
            {modes.map((option) => (
              <MenuRadioItem key={option.value} value={option.value}>
                {option.label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
          <MenuSeparator />
          <MenuRadioGroup
            value={theme}
            onValueChange={(value) => setTheme(value as ThemeName)}
          >
            <MenuGroupLabel>Theme</MenuGroupLabel>
            {themes.map((option) => (
              <MenuRadioItem key={option.name} value={option.name}>
                {option.label}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
          <MenuSeparator />
          <MenuRadioGroup
            value={densityPreference}
            onValueChange={(value) => setDensity(value as DensityPreference)}
          >
            <MenuGroupLabel>Density</MenuGroupLabel>
            <MenuRadioItem value="theme">Theme default</MenuRadioItem>
            {DENSITIES.map((density) => (
              <MenuRadioItem key={density} value={density}>
                {density === "comfortable" ? "Comfortable" : "Compact"}
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuContent>
      </Menu>
    </div>
  );
}
