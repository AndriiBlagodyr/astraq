import { contrast } from "./contrast";
import { veracand } from "./veracand";
import { graphite } from "./graphite";
import { midnight } from "./midnight";
import { paper } from "./paper";
import { terminal } from "./terminal";

/** Registration order is the order apps and Storybook list themes in. */
export const THEME_SOURCES = [veracand, terminal, midnight, paper, graphite, contrast] as const;
