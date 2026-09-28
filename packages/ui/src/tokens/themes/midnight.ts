import type { ThemeSource } from "../schema";

export const midnight = {
  name: "midnight",
  label: "Midnight",
  description: "Violet and pink on deep indigo. Soft, low-glare surfaces.",
  neutral: { hue: 287, chroma: 1.05 },
  brand: {
    base: "#a8a3ff",
    strong: "#725cff",
    warm: "#ff9bd5",
    gradient: [
      { color: "#a8a3ff", at: 0 },
      // Nudged from #725cff: dark button text only reached 4.44:1 on it.
      { color: "#7562fe", at: 52 },
      { color: "#ff9bd5", at: 100 },
    ],
    onBrand: "#0a0718",
  },
  status: { positive: "#4fe2b1", negative: "#ff7797", warning: "#ffc46b" },
} as const satisfies ThemeSource;
