"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export const COLOR_MODE_STORAGE_KEY = "astraq-color-mode";
export const THEME_STORAGE_KEY = "astraq-theme";

export type ColorMode = "light" | "dark";
export type ThemeName = "astraq" | "terminal" | "midnight";

type ThemeContextValue = {
  mode: ColorMode;
  theme: ThemeName;
  setMode: (mode: ColorMode) => void;
  setTheme: (theme: ThemeName) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_CHANGE_EVENT = "astraq-theme-change";

function applyTheme(mode: ColorMode, theme: ThemeName) {
  const root = document.documentElement;
  root.dataset.mode = mode;
  root.dataset.theme = theme;
  root.style.colorScheme = mode;
}

function getThemeSnapshot() {
  const mode =
    document.documentElement.dataset.mode === "light" ? "light" : "dark";
  const storedTheme = document.documentElement.dataset.theme;
  const theme =
    storedTheme === "terminal" || storedTheme === "midnight"
      ? storedTheme
      : "astraq";
  return `${mode}:${theme}`;
}

function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function publishTheme(mode: ColorMode, theme: ThemeName) {
  applyTheme(mode, theme);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(
    subscribeToTheme,
    getThemeSnapshot,
    () => "dark:astraq",
  );
  const [modeValue, themeValue] = snapshot.split(":");
  const mode: ColorMode = modeValue === "light" ? "light" : "dark";
  const theme: ThemeName =
    themeValue === "terminal" || themeValue === "midnight"
      ? themeValue
      : "astraq";

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      theme,
      setMode(nextMode) {
        localStorage.setItem(COLOR_MODE_STORAGE_KEY, nextMode);
        publishTheme(nextMode, theme);
      },
      setTheme(nextTheme) {
        localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        publishTheme(mode, nextTheme);
      },
      toggleMode() {
        const nextMode = mode === "dark" ? "light" : "dark";
        localStorage.setItem(COLOR_MODE_STORAGE_KEY, nextMode);
        publishTheme(nextMode, theme);
      },
    }),
    [mode, theme],
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
