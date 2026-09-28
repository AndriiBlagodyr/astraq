import { FONTS, type ThemeSource } from "../schema";

export const graphite = {
  name: "graphite",
  label: "Graphite",
  description: "Neutral monochrome with one restrained blue accent.",
  density: "comfortable",
  surfaces: "opaque",
  contrast: "AA",
  type: { sans: FONTS.geist, display: FONTS.geist, mono: FONTS.mono },
  shape: {
    radius: { sm: "6px", md: "8px", lg: "8px", xl: "8px", pill: "8px" },
    border: "1px",
    focusRing: "2px",
  },
  links: "plain",
  // A trace of blue keeps the grays from reading as dirty.
  neutral: { hue: 260, chroma: 0.12 },
  brand: {
    base: "#5b8def",
    strong: "#2a63d4",
    warm: "#8fb3ff",
    gradient: [
      { color: "#2a63d4", at: 0 },
      { color: "#2a63d4", at: 50 },
      { color: "#2a63d4", at: 100 },
    ],
    onBrand: "#ffffff",
  },
  status: { positive: "#3fb27f", negative: "#e5484d", warning: "#f5a524" },
} as const satisfies ThemeSource;
