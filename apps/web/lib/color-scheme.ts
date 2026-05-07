/**
 * Single source of truth for where Astraq stores the user's color scheme.
 *
 * Both the inline `<ColorSchemeScript />` (runs synchronously before paint to
 * set the html `data-mantine-color-scheme` attribute) and Mantine's
 * `localStorageColorSchemeManager` (used by `MantineProvider` after hydration)
 * must read and write the same key — otherwise the script paints the default
 * scheme on reload before the manager kicks in, producing a brief theme flash.
 */
export const COLOR_SCHEME_STORAGE_KEY = "astraq-color-scheme";

export const DEFAULT_COLOR_SCHEME = "dark" as const;
