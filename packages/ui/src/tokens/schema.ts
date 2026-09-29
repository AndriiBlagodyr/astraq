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

export type Density = "comfortable" | "compact";
export const DENSITIES: readonly Density[] = ["comfortable", "compact"];

/**
 * How surfaces are drawn:
 * - `glass`: translucent, blurred, gradient page and cards, soft glow shadows.
 * - `opaque`: solid surfaces and fills, no blur or gradients, subtle shadows.
 * - `flat`: like `opaque`, but no shadows at all; edges come from hairlines.
 */
export type SurfaceStyle = "glass" | "opaque" | "flat";

/** WCAG level the colors are solved to. AAA raises text to 7:1 and non-text to 4.5:1. */
export type ContrastLevel = "AA" | "AAA";

export type ThemeSource = {
  name: string;
  label: string;
  description: string;
  /** Used when the user hasn't picked a density. */
  density: Density;
  surfaces: SurfaceStyle;
  contrast: ContrastLevel;
  type: { sans: string; display: string; mono: string };
  shape: {
    radius: { sm: string; md: string; lg: string; xl: string; pill: string };
    /** Width of every `border` utility. */
    border: string;
    /** Width of the keyboard focus outline. */
    focusRing: string;
  };
  /** Inline links: plain until hovered, or always underlined. */
  links: "plain" | "underline";
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

/** Tokens that vary by theme but not by mode: type, shape, and surface treatment. */
export const THEME_TOKENS = [
  "font-sans",
  "font-display",
  "font-mono",
  "radius-sm",
  "radius-md",
  "radius-lg",
  "radius-xl",
  "radius-pill",
  "border-width",
  "focus-width",
  "link-decoration",
  "blur-surface",
  "blur-overlay",
] as const;

/**
 * Sizing that follows `data-density` (or the theme's default): control
 * heights, their inline padding, and table cell padding.
 */
export const DENSITY_TOKENS = [
  "control-sm",
  "control-md",
  "control-lg",
  "inset-sm",
  "inset-md",
  "inset-lg",
  "cell-y",
  "head-y",
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];
export type ThemeToken = (typeof THEME_TOKENS)[number];
export type DensityToken = (typeof DENSITY_TOKENS)[number];
export type EffectToken = (typeof EFFECT_TOKENS)[number];
export type ModeTokens = Record<ColorToken | EffectToken, string>;

export type ResolvedTheme = {
  source: ThemeSource;
  tokens: Record<ThemeToken, string>;
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

export const DENSITY_VALUES: Record<Density, Record<DensityToken, string>> = {
  comfortable: {
    "control-sm": "2.25rem",
    "control-md": "2.75rem",
    "control-lg": "3rem",
    "inset-sm": "1rem",
    "inset-md": "1.25rem",
    "inset-lg": "1.5rem",
    "cell-y": "1rem",
    "head-y": "0.75rem",
  },
  compact: {
    "control-sm": "1.75rem",
    "control-md": "2.25rem",
    "control-lg": "2.5rem",
    "inset-sm": "0.75rem",
    "inset-md": "1rem",
    "inset-lg": "1.25rem",
    "cell-y": "0.5rem",
    "head-y": "0.5rem",
  },
};

/** Font stacks shared by several themes. */
export const FONTS = {
  geist: '"Geist", "Avenir Next", "Segoe UI", sans-serif',
  sora: '"Sora", "Avenir Next", "Segoe UI", sans-serif',
  mono: '"SFMono-Regular", "SF Mono", "Consolas", monospace',
  /** Terminal's display face: a coding mono with strong digit shapes. */
  terminal: '"JetBrains Mono", "IBM Plex Mono", "SFMono-Regular", "Consolas", monospace',
  serif: '"Fraunces", "Iowan Old Style", Georgia, serif',
  system: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
} as const;

/** Theme-independent tokens. */
export const SHARED_TOKENS = {
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
