/**
 * Theme identities and color modes for runtime code.
 *
 * THEMES comes from the generated registry, which the token build writes from
 * `tokens/themes/*.ts`, so apps get names and labels without bundling the
 * theme sources or color math. Add a theme there, then run `pnpm tokens`.
 */

import { DEFAULT_THEME as GENERATED_DEFAULT, THEMES } from "../tokens/generated/registry";

export { THEMES };

export type ThemeDefinition = {
  name: string;
  label: string;
  description: string;
  /** Density used when the user hasn't picked one. */
  density: Density;
};

export type ThemeName = (typeof THEMES)[number]["name"];

export const THEME_NAMES: readonly ThemeName[] = THEMES.map(
  (theme) => theme.name,
);

/** The first registered theme; also the CSS fallback when `data-theme` is absent. */
export const DEFAULT_THEME: ThemeName = GENERATED_DEFAULT;

export const COLOR_MODES = ["light", "dark"] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

/** What the user chose. `system` follows `prefers-color-scheme`. */
export type ColorModePreference = ColorMode | "system";

export const DEFAULT_COLOR_MODE: ColorMode = "dark";

export const DENSITIES = ["comfortable", "compact"] as const;
export type Density = (typeof DENSITIES)[number];

/** What the user chose. `theme` follows the active theme's default density. */
export type DensityPreference = Density | "theme";

export const COLOR_MODE_STORAGE_KEY = "veracand-color-mode";
export const THEME_STORAGE_KEY = "veracand-theme";
export const DENSITY_STORAGE_KEY = "veracand-density";

export function themeDensity(theme: ThemeName): Density {
  return THEMES.find((entry) => entry.name === theme)?.density ?? "comfortable";
}

export function isDensity(value: unknown): value is Density {
  return DENSITIES.includes(value as Density);
}

export function isDensityPreference(value: unknown): value is DensityPreference {
  return value === "theme" || isDensity(value);
}

export function isThemeName(value: unknown): value is ThemeName {
  return THEME_NAMES.includes(value as ThemeName);
}

export function isColorMode(value: unknown): value is ColorMode {
  return COLOR_MODES.includes(value as ColorMode);
}

export function isColorModePreference(
  value: unknown,
): value is ColorModePreference {
  return value === "system" || isColorMode(value);
}
