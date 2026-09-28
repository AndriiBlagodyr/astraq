import { forelume } from "./forelume";
import { midnight } from "./midnight";
import { terminal } from "./terminal";

/** Registration order is the order apps and Storybook list themes in. */
export const THEME_SOURCES = [forelume, terminal, midnight] as const;
