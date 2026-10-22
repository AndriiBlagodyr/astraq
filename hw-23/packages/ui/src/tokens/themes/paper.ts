import { FONTS, type ThemeSource } from "../schema";

export const paper = {
  name: "paper",
  label: "Paper",
  description: "Warm off-white and ink, like a printed research report. Sepia at night.",
  density: "comfortable",
  surfaces: "opaque",
  contrast: "AA",
  type: { sans: FONTS.geist, display: FONTS.serif, mono: FONTS.mono },
  shape: {
    radius: { sm: "4px", md: "6px", lg: "6px", xl: "8px", pill: "6px" },
    border: "1px",
    focusRing: "2px",
  },
  links: "plain",
  // Warm hue: cream paper by day, sepia by night.
  neutral: { hue: 75, chroma: 1 },
  brand: {
    base: "#c2562e",
    strong: "#9a3d1c",
    warm: "#c79a3a",
    // Opaque: the primary fill is solid ink-red.
    gradient: [
      { color: "#9a3d1c", at: 0 },
      { color: "#9a3d1c", at: 50 },
      { color: "#9a3d1c", at: 100 },
    ],
    onBrand: "#fff8ef",
  },
  status: { positive: "#2f8f5b", negative: "#c0392b", warning: "#b7791f" },
} as const satisfies ThemeSource;
