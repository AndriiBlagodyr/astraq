// @vitest-environment node
// Reads the real token CSS (Vitest blanks CSS imports), so it runs in Node.
import { readFileSync } from "node:fs";
import { COLOR_MODES, THEME_NAMES } from "../theme/registry";
import { composite, contrastRatio, parseColor } from "./contrast";

const css = readFileSync(new URL("./index.css", import.meta.url), "utf8");

type Block = { selectors: string[]; declarations: Map<string, string> };

const blocks: Block[] = [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(
  /([^{}]+)\{([^{}]*)\}/g,
)]
  .filter(([, selector]) => selector.includes(":root"))
  .map(([, selector, body]) => ({
    selectors: selector.split(",").map((s) => s.trim()),
    declarations: new Map(
      [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, k, v]) => [
        k,
        v.replace(/\s+/g, " ").trim(),
      ]),
    ),
  }));

/** Matches the handful of selector shapes tokens/index.css uses. */
function matches(selector: string, theme: string, mode: string) {
  if (selector.startsWith("@")) return false;
  const attr = (name: string) =>
    selector.replace(/:not\([^)]*\)/g, "").match(new RegExp(`\\[${name}="([^"]+)"\\]`))?.[1];
  const notMode = selector.match(/:not\(\[data-mode="([^"]+)"\]\)/)?.[1];
  const t = attr("data-theme");
  const m = attr("data-mode");
  return (
    selector.startsWith(":root") &&
    (!t || t === theme) &&
    (!m || m === mode) &&
    notMode !== mode
  );
}

const specificity = (selector: string) => (selector.match(/\[/g) ?? []).length;

/** Resolves custom properties for one theme × mode the way the cascade would. */
function resolveTokens(theme: string, mode: string) {
  const applied = blocks
    .flatMap((block, order) =>
      block.selectors
        .filter((s) => matches(s, theme, mode))
        .map((s) => ({ block, order, weight: specificity(s) })),
    )
    .sort((a, b) => a.weight - b.weight || a.order - b.order);

  const tokens = new Map<string, string>();
  for (const { block } of applied) {
    block.declarations.forEach((value, key) => tokens.set(key, value));
  }

  const read = (name: string): string => {
    const value = tokens.get(name);
    if (!value) throw new Error(`${name} undefined for ${theme}/${mode}`);
    const ref = value.match(/^var\((--[\w-]+)\)$/);
    return ref ? read(ref[1]) : value;
  };
  return read;
}

const TONES = ["brand", "brand-strong", "positive", "negative", "warning"];
// Tints the components put behind tone-colored text: feedback 8%, badges 10%,
// danger button 12% / hover 18% / active 24%.
const TINTS = [0, 0.08, 0.1, 0.12, 0.18, 0.24];
const SURFACES = [
  "--ds-surface",
  "--ds-surface-strong",
  "--ds-surface-muted",
];

describe.each(THEME_NAMES)("%s theme", (theme) => {
  describe.each(COLOR_MODES)("%s mode", (mode) => {
    const read = resolveTokens(theme, mode);
    const page = parseColor(read("--ds-background"));
    const backgrounds = [
      page,
      parseColor(read("--ds-background-elevated")),
      ...SURFACES.map((name) => composite(parseColor(read(name)), page)),
    ];

    it.each(TONES)("--ds-%s-fg reads at 4.5:1 on surfaces and its tints", (tone) => {
      const text = parseColor(read(`--ds-${tone}-fg`));
      const fill = parseColor(read(`--ds-${tone}`));

      const worst = Math.min(
        ...backgrounds.flatMap((background) =>
          TINTS.map((tint) =>
            contrastRatio(text, composite(fill, background, tint)),
          ),
        ),
      );

      expect(worst).toBeGreaterThanOrEqual(4.5);
    });
  });
});
