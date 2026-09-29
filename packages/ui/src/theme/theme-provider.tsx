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
  DENSITY_STORAGE_KEY,
  THEMES,
  THEME_STORAGE_KEY,
  isColorModePreference,
  isDensityPreference,
  isThemeName,
  themeDensity,
  type ColorMode,
  type ColorModePreference,
  type Density,
  type DensityPreference,
  type ThemeName,
} from "./registry";

type ThemeContextValue = {
  /** The resolved mode currently applied to the document. */
  mode: ColorMode;
  /** What the user chose; `system` follows the OS setting. */
  modePreference: ColorModePreference;
  theme: ThemeName;
  themes: typeof THEMES;
  /** The density in effect: the user's choice, or the theme's default. */
  density: Density;
  /** What the user chose; `theme` follows the active theme's default. */
  densityPreference: DensityPreference;
  setMode: (mode: ColorModePreference) => void;
  setTheme: (theme: ThemeName) => void;
  setDensity: (density: DensityPreference) => void;
  toggleMode: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_CHANGE_EVENT = "forelume-theme-change";
const LIGHT_QUERY = "(prefers-color-scheme: light)";
const SERVER_SNAPSHOT = `${DEFAULT_COLOR_MODE}:${DEFAULT_THEME}:system:theme`;

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

function readDensityPreference(): DensityPreference {
  const stored = readStorage(DENSITY_STORAGE_KEY);
  return isDensityPreference(stored) ? stored : "theme";
}

/** `theme` leaves `data-density` off, so the theme's CSS default applies. */
function applyDensity(preference: DensityPreference) {
  const root = document.documentElement;
  if (preference === "theme") delete root.dataset.density;
  else root.dataset.density = preference;
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

/** Milliseconds from a motion token such as `--ds-motion-slow` ("320ms"). */
function motionDuration(token: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token);
  return Number.parseFloat(value) || 0;
}

/**
 * A user-initiated theme or mode change: the new look grows out of the control
 * that triggered it as a circle (docs/motion.md). Falls back to an instant
 * swap without View Transitions, and when motion tokens are 0ms (reduced
 * motion).
 */
function publishWithReveal(mode: ColorMode, theme: ThemeName) {
  const duration = motionDuration("--ds-motion-slow");
  if (!document.startViewTransition || duration === 0) {
    publishTheme(mode, theme);
    return;
  }

  // Keyboard and pointer both focus the trigger (except Safari clicks), so
  // its center is the origin; the viewport center otherwise.
  const trigger = document.activeElement;
  const rect =
    trigger && trigger !== document.body ? trigger.getBoundingClientRect() : null;
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  // Scopes the reveal CSS so other view transitions keep their own animation.
  const root = document.documentElement;
  root.dataset.themeReveal = "";
  const transition = document.startViewTransition(() => publishTheme(mode, theme));
  transition.finished.finally(() => delete root.dataset.themeReveal).catch(() => {});
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration,
          easing: getComputedStyle(root).getPropertyValue("--ds-ease-out"),
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    // A transition skipped by the browser (e.g. a hidden tab) still applied the change.
    .catch(() => {});
}

function currentTheme(): ThemeName {
  const theme = document.documentElement.dataset.theme;
  return isThemeName(theme) ? theme : DEFAULT_THEME;
}

function getThemeSnapshot() {
  const mode =
    document.documentElement.dataset.mode === "light" ? "light" : "dark";
  return `${mode}:${currentTheme()}:${readPreference()}:${readDensityPreference()}`;
}

function subscribeToTheme(onStoreChange: () => void) {
  // Another tab changed the preference: re-apply it here, then notify.
  function onStorage(event: StorageEvent) {
    if (
      event.key !== COLOR_MODE_STORAGE_KEY &&
      event.key !== THEME_STORAGE_KEY &&
      event.key !== DENSITY_STORAGE_KEY
    ) {
      return;
    }
    applyDensity(readDensityPreference());
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
  const [modeValue, themeValue, preferenceValue, densityValue] =
    snapshot.split(":");
  const mode: ColorMode = modeValue === "light" ? "light" : "dark";
  const theme: ThemeName = isThemeName(themeValue) ? themeValue : DEFAULT_THEME;
  const modePreference: ColorModePreference = isColorModePreference(
    preferenceValue,
  )
    ? preferenceValue
    : "system";
  const densityPreference: DensityPreference = isDensityPreference(densityValue)
    ? densityValue
    : "theme";
  const density: Density =
    densityPreference === "theme" ? themeDensity(theme) : densityPreference;

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
      density,
      densityPreference,
      setMode(nextPreference) {
        writeStorage(COLOR_MODE_STORAGE_KEY, nextPreference);
        publishWithReveal(resolveMode(nextPreference), theme);
      },
      setTheme(nextTheme) {
        writeStorage(THEME_STORAGE_KEY, nextTheme);
        publishWithReveal(mode, nextTheme);
      },
      setDensity(nextPreference) {
        writeStorage(DENSITY_STORAGE_KEY, nextPreference);
        applyDensity(nextPreference);
        window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
      },
      toggleMode() {
        const nextMode = mode === "dark" ? "light" : "dark";
        writeStorage(COLOR_MODE_STORAGE_KEY, nextMode);
        publishWithReveal(nextMode, theme);
      },
    }),
    [mode, modePreference, theme, density, densityPreference],
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
