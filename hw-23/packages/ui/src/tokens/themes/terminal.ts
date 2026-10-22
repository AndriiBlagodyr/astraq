import { FONTS, type ThemeSource } from "../schema";

export const terminal = {
  name: "terminal",
  label: "Terminal",
  description: "Phosphor green and acid yellow on green-black. Dense trading screens.",
  density: "compact",
  surfaces: "flat",
  contrast: "AA",
  type: { sans: FONTS.geist, display: FONTS.terminal, mono: FONTS.terminal },
  shape: {
    radius: { sm: "2px", md: "3px", lg: "4px", xl: "4px", pill: "3px" },
    border: "1px",
    focusRing: "2px",
  },
  links: "plain",
  // Low chroma: a hint of phosphor in the blacks, not a green wash.
  neutral: { hue: 158, chroma: 0.55 },
  brand: {
    base: "#67f7a2",
    strong: "#17b968",
    warm: "#e2ff6a",
    // Flat: the primary fill is solid.
    gradient: [
      { color: "#18c978", at: 0 },
      { color: "#18c978", at: 50 },
      { color: "#18c978", at: 100 },
    ],
    onBrand: "#03110a",
  },
  status: { positive: "#67f7a2", negative: "#ff6f91", warning: "#e2ff6a" },
} as const satisfies ThemeSource;
