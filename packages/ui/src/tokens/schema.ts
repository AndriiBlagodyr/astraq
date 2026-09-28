/**
 * The theme contract (ADR 0002 §2).
 *
 * A theme is authored as a small set of seeds (`ThemeSource`). The build
 * derives every semantic token from them, per mode, and emits CSS custom
 * properties named `--ds-<token>`.
 */

export type Mode = "light" | "dark";
export const MODES: readonly Mode[] = ["dark", "light"];

export type GradientStop = { color: string; at: number };

export type ThemeSource = {
  name: string;
  label: string;
  description: string;
  /** Tints every neutral: backgrounds, surfaces, borders, text, shadows. */
  neutral: { hue: number; chroma: number };
  brand: {
    base: string;
    strong: string;
    warm: string;
    /** Primary button fill, left to right. */
    gradient: readonly [GradientStop, GradientStop, GradientStop];
    /** Text on brand fills and the brand gradient. */
    onBrand: string;
  };
  status: { positive: string; negative: string; warning: string };
};

/** Semantic color tokens. Components and apps use only these. */
export const COLOR_TOKENS = [
  "bg-canvas",
  "bg-subtle",
  "bg-surface",
  "bg-raised",
  "bg-sunken",
  "bg-overlay",
  "fg-default",
  "fg-muted",
  "fg-subtle",
  "fg-on-brand",
  "border-subtle",
  "border-default",
  "border-strong",
  "focus-ring",
  "focus-halo",
  "brand",
  "brand-strong",
  "brand-warm",
  "brand-fg",
  "brand-strong-fg",
  "positive",
  "positive-fg",
  "negative",
  "negative-fg",
  "warning",
  "warning-fg",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "chart-6",
  "chart-7",
  "chart-8",
  "chart-grid",
  "chart-axis",
] as const;

export const EFFECT_TOKENS = [
  "shadow-soft",
  "shadow-brand",
  "gradient-brand",
  "gradient-page",
  "gradient-surface",
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];
export type EffectToken = (typeof EFFECT_TOKENS)[number];
export type ModeTokens = Record<ColorToken | EffectToken, string>;

export type ResolvedTheme = {
  source: ThemeSource;
  modes: Record<
    Mode,
    {
      tokens: ModeTokens;
      /** Stops of the card surface gradient; text must read on both. */
      surfaceGradient: readonly string[];
      primitives: { neutral: readonly string[]; brand: readonly string[] };
    }
  >;
};

/** Theme-independent tokens (fonts and radii become per-theme in PR 4). */
export const SHARED_TOKENS = {
  "font-sans": '"Geist", "Avenir Next", "Segoe UI", sans-serif',
  "font-display": '"Sora", "Avenir Next", "Segoe UI", sans-serif',
  "font-mono": '"SFMono-Regular", "SF Mono", "Consolas", monospace',
  "radius-sm": "0.75rem",
  "radius-md": "1.125rem",
  "radius-lg": "1.5rem",
  "radius-xl": "2rem",
  "motion-fast": "160ms",
  "motion-base": "220ms",
  "motion-slow": "320ms",
  "ease-out": "cubic-bezier(0.22, 1, 0.36, 1)",
  "ease-in": "cubic-bezier(0.55, 0, 1, 0.45)",
} as const;

/**
 * Pre-PR 2 names, kept as aliases so apps/web keeps working during the
 * migration. Delete in PR 7 (docs/design-system-plan.md).
 */
export const LEGACY_ALIASES: Record<string, ColorToken | EffectToken> = {
  background: "bg-canvas",
  "background-elevated": "bg-subtle",
  surface: "bg-surface",
  "surface-strong": "bg-raised",
  "surface-muted": "bg-sunken",
  overlay: "bg-overlay",
  foreground: "fg-default",
  "foreground-secondary": "fg-muted",
  "foreground-muted": "fg-subtle",
  "brand-contrast": "fg-on-brand",
  border: "border-default",
  row: "border-subtle",
  focus: "focus-halo",
};
