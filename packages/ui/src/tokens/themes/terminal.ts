import type { ThemeSource } from "../schema";

export const terminal = {
  name: "terminal",
  label: "Terminal",
  description: "Phosphor green and acid yellow on green-black. Dense trading screens.",
  // Low chroma: a hint of phosphor in the blacks, not a green wash.
  neutral: { hue: 158, chroma: 0.55 },
  brand: {
    base: "#67f7a2",
    strong: "#17b968",
    warm: "#e2ff6a",
    gradient: [
      { color: "#67f7a2", at: 0 },
      { color: "#18c978", at: 58 },
      { color: "#e2ff6a", at: 100 },
    ],
    onBrand: "#03110a",
  },
  status: { positive: "#67f7a2", negative: "#ff6f91", warning: "#e2ff6a" },
} as const satisfies ThemeSource;
