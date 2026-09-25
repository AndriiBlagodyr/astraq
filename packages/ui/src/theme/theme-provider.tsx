"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  COLOR_MODE_STORAGE_KEY,
  DEFAULT_COLOR_MODE,
  DEFAULT_THEME,
  THEMES,
  THEME_STORAGE_KEY,
  isColorModePreference,
  isThemeName,
  type ColorMode,
  type ColorModePreference,
  type ThemeName,
} from "./registry";

type ThemeContextValue = {
  /** The resolved mode currently applied to the document. */
  mode: ColorMode;
  /** What the user chose; `system` follows the OS setting. */
  modePreference: ColorModePreference;
  theme: ThemeName;
  themes: typeof THEMES;
  setMode: (mode: ColorModePreference) => void;
  setTheme: (theme: ThemeName) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_CHANGE_EVENT = "forelume-theme-change";
const LIGHT_QUERY = "(prefers-color-scheme: light)";
const SERVER_SNAPSHOT = `${DEFAULT_COLOR_MODE}:${DEFAULT_THEME}:system`;

function readStorage(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode, blocked cookies). The choice
    // still applies for this page view.
  }
}

function readPreference(): ColorModePreference {
  const stored = readStorage(COLOR_MODE_STORAGE_KEY);
  return isColorModePreference(stored) ? stored : "system";
}

function resolveMode(preference: ColorModePreference): ColorMode {
  if (preference !== "system") return preference;
  return window.matchMedia?.(LIGHT_QUERY).matches ? "light" : "dark";
}

function applyTheme(mode: ColorMode, theme: ThemeName) {
  const root = document.documentElement;
  root.dataset.mode = mode;
  root.dataset.theme = theme;
  root.style.colorScheme = mode;
}

function publishTheme(mode: ColorMode, theme: ThemeName) {
  applyTheme(mode, theme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

function currentTheme(): ThemeName {
  const theme = document.documentElement.dataset.theme;
  return isThemeName(theme) ? theme : DEFAULT_THEME;
}

function getThemeSnapshot() {
  const mode =
    document.documentElement.dataset.mode === "light" ? "light" : "dark";
  return `${mode}:${currentTheme()}:${readPreference()}`;
}

function subscribeToTheme(onStoreChange: () => void) {
  // Another tab changed the preference: re-apply it here, then notify.
  function onStorage(event: StorageEvent) {
    if (
      event.key !== COLOR_MODE_STORAGE_KEY &&
      event.key !== THEME_STORAGE_KEY
    ) {
      return;
    }
    const storedTheme = readStorage(THEME_STORAGE_KEY);
    applyTheme(
      resolveMode(readPreference()),
      isThemeName(storedTheme) ? storedTheme : DEFAULT_THEME,
    );
    onStoreChange();
  }

  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    () => SERVER_SNAPSHOT,
  );
  const [modeValue, themeValue, preferenceValue] = snapshot.split(":");
  const mode: ColorMode = modeValue === "light" ? "light" : "dark";
  const theme: ThemeName = isThemeName(themeValue) ? themeValue : DEFAULT_THEME;
  const modePreference: ColorModePreference = isColorModePreference(
    preferenceValue,
  )
    ? preferenceValue
    : "system";

  // Follow OS changes while the user's preference is `system`.
  useEffect(() => {
    if (modePreference !== "system" || !window.matchMedia) return;

    const query = window.matchMedia(LIGHT_QUERY);
    const onChange = () => publishTheme(resolveMode("system"), currentTheme());
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [modePreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      modePreference,
      theme,
      themes: THEMES,
      setMode(nextPreference) {
        writeStorage(COLOR_MODE_STORAGE_KEY, nextPreference);
        publishTheme(resolveMode(nextPreference), theme);
      },
      setTheme(nextTheme) {
        writeStorage(THEME_STORAGE_KEY, nextTheme);
        publishTheme(mode, nextTheme);
      },
      toggleMode() {
        const nextMode = mode === "dark" ? "light" : "dark";
        writeStorage(COLOR_MODE_STORAGE_KEY, nextMode);
        publishTheme(nextMode, theme);
      },
    }),
    [mode, modePreference, theme],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}
