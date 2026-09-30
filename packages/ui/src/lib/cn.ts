import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Mirror the custom `@theme` keys in styles/index.css. Without them twMerge
// treats `px-inset-md` as unknown and keeps it next to an overriding `px-0`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      spacing: [
        "control-sm",
        "control-md",
        "control-lg",
        "inset-sm",
        "inset-md",
        "inset-lg",
        "cell-y",
        "head-y",
      ],
      radius: ["pill"],
      shadow: ["soft", "brand"],
      blur: ["surface", "overlay"],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
