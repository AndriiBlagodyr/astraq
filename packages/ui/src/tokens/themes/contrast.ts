import { FONTS, type ThemeSource } from "../schema";

export const contrast = {
  name: "contrast",
  label: "High contrast",
  description: "Accessibility first: AAA text, solid 2px borders, a thick focus ring, underlined links.",
  density: "comfortable",
  surfaces: "opaque",
  contrast: "AAA",
  type: { sans: FONTS.system, display: FONTS.system, mono: FONTS.mono },
  shape: {
    radius: { sm: "4px", md: "4px", lg: "4px", xl: "4px", pill: "4px" },
    border: "2px",
    focusRing: "3px",
  },
  links: "underline",
  // Pure grays: no tint to lower contrast.
  neutral: { hue: 0, chroma: 0 },
  brand: {
    base: "#3b82f6",
    strong: "#0b4fb3",
    warm: "#ffb000",
    gradient: [
      { color: "#0b4fb3", at: 0 },
      { color: "#0b4fb3", at: 50 },
      { color: "#0b4fb3", at: 100 },
    ],
    onBrand: "#ffffff",
  },
  status: { positive: "#1a7f37", negative: "#cf222e", warning: "#9a6700" },
} as const satisfies ThemeSource;
