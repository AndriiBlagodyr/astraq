import { FONTS, type ThemeSource } from "../schema";

export const forelume = {
  name: "forelume",
  label: "Forelume",
  description: "Cyan to indigo with a warm gold accent. Glass surfaces.",
  density: "comfortable",
  surfaces: "glass",
  contrast: "AA",
  type: { sans: FONTS.geist, display: FONTS.sora, mono: FONTS.mono },
  shape: {
    radius: { sm: "0.75rem", md: "1.125rem", lg: "1.5rem", xl: "2rem", pill: "9999px" },
    border: "1px",
    focusRing: "2px",
  },
  links: "plain",
  neutral: { hue: 257, chroma: 1 },
  brand: {
    base: "#4ceeff",
    strong: "#466cef",
    warm: "#f4c96d",
    gradient: [
      { color: "#6ef2ff", at: 0 },
      { color: "#7d91ff", at: 55 },
      { color: "#f4c96d", at: 100 },
    ],
    onBrand: "#04101c",
  },
  status: { positive: "#39d98a", negative: "#ff6b7b", warning: "#ffb04d" },
} as const satisfies ThemeSource;
