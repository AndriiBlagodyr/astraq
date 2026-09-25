/**
 * Single source of truth for theme identities and color modes.
 *
 * ThemeProvider, ThemeScript, Storybook, and apps read from here instead of
 * hardcoding theme names. The token pipeline (ADR 0002) will generate this
 * file from the typed theme definitions.
 */

export type ThemeDefinition = {
  name: string;
  label: string;
  description: string;
};

export const THEMES = [
  {
    name: "forelume",
    label: "Forelume",
    description: "Cyan to indigo with a warm gold accent. Glass surfaces.",
  },
  {
    name: "terminal",
    label: "Terminal",
    description: "Phosphor green and acid yellow for dense trading screens.",
  },
  {
    name: "midnight",
    label: "Midnight",
    description: "Violet and pink with soft, low-glare surfaces.",
  },
] as const satisfies readonly ThemeDefinition[];

export type ThemeName = (typeof THEMES)[number]["name"];

export const THEME_NAMES: readonly ThemeName[] = THEMES.map(
  (theme) => theme.name,
);

export const DEFAULT_THEME: ThemeName = "forelume";

export const COLOR_MODES = ["light", "dark"] as const;
export type ColorMode = (typeof COLOR_MODES)[number];

/** What the user chose. `system` follows `prefers-color-scheme`. */
export type ColorModePreference = ColorMode | "system";

export const DEFAULT_COLOR_MODE: ColorMode = "dark";

export const COLOR_MODE_STORAGE_KEY = "forelume-color-mode";
export const THEME_STORAGE_KEY = "forelume-theme";

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
