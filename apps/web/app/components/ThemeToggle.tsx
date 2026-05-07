"use client";

import { useSyncExternalStore } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import styles from "./ThemeToggle.module.css";

type ThemeToggleProps = {
  className?: string;
};

const DEFAULT_SCHEME = "dark" as const;

const noopSubscribe = () => () => {};
const getMountedSnapshot = () => true;
const getMountedServerSnapshot = () => false;

/**
 * Returns false during SSR and on the very first client render, then true
 * after hydration. Implemented with useSyncExternalStore so we avoid the
 * `react-hooks/set-state-in-effect` lint rule and the extra render that a
 * useEffect+useState pattern triggers.
 */
function useHasMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, getMountedSnapshot, getMountedServerSnapshot);
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme(DEFAULT_SCHEME, {
    getInitialValueInEffect: true,
  });

  // Mantine's ColorSchemeScript runs before hydration and may flip the
  // document scheme away from the server-rendered default. Rendering the
  // default until mount avoids the resulting hydration mismatch without
  // flashing the wrong icon.
  const mounted = useHasMounted();
  const activeScheme = mounted ? computedColorScheme : DEFAULT_SCHEME;
  const isDark = activeScheme === "dark";
  const nextColorScheme = isDark ? "light" : "dark";
  const rootClassName = [styles.button, className].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={rootClassName}
      onClick={() => setColorScheme(nextColorScheme)}
      aria-label={`Switch to ${nextColorScheme} theme`}
      title={`Switch to ${nextColorScheme} theme`}
    >
      {isDark ? (
        <MoonStar className={styles.icon} strokeWidth={1.8} />
      ) : (
        <SunMedium className={styles.icon} strokeWidth={1.8} />
      )}
      <span className={styles.label}>{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
