"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import styles from "./ThemeToggle.module.css";

type ThemeToggleProps = {
  className?: string;
};

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("dark", {
    getInitialValueInEffect: true,
  });

  const nextColorScheme = computedColorScheme === "dark" ? "light" : "dark";
  const rootClassName = [styles.button, className].filter(Boolean).join(" ");

  return (
    <button
      type="button"
      className={rootClassName}
      onClick={() => setColorScheme(nextColorScheme)}
      aria-label={`Switch to ${nextColorScheme} theme`}
      title={`Switch to ${nextColorScheme} theme`}
    >
      {computedColorScheme === "dark" ? (
        <MoonStar className={styles.icon} strokeWidth={1.8} />
      ) : (
        <SunMedium className={styles.icon} strokeWidth={1.8} />
      )}
      <span className={styles.label}>{computedColorScheme === "dark" ? "Dark" : "Light"}</span>
    </button>
  );
}
