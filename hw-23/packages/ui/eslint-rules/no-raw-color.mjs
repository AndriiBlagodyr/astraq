/**
 * Components read semantic tokens only (bg-surface, text-negative-fg,
 * var(--ds-bg-sunken)). A raw color in a component file looks fine in the
 * theme it was written in and wrong in the other five, so this rule rejects
 * one in any string, template or JSX text:
 *
 * - hex colors: `#0a172a`, `bg-[#fff]`;
 * - color functions: `rgb(`, `hsl(`, `oklch(`, ...;
 * - primitive scale variables: `--p-*`;
 * - Tailwind's default palette: `bg-red-500`, `text-white`.
 *
 * Comments aren't checked, so they can still name a color.
 */

const PALETTE =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const UTILITY =
  "bg|text|border(?:-[trblxyse])?|ring|ring-offset|outline|fill|stroke|from|via|to|divide|decoration|caret|accent|placeholder|shadow";

const CHECKS = [
  {
    messageId: "hex",
    // `&` and word characters before `#` mean an entity or an id, not a color.
    pattern: /(?<![\w&])#(?:[0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{3,4})(?![\w-])/i,
  },
  {
    messageId: "colorFunction",
    pattern: /(?<![\w-])(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/i,
  },
  {
    messageId: "primitive",
    pattern: /--p-[\w-]/,
  },
  {
    messageId: "palette",
    pattern: new RegExp(
      `(?<![\\w-])(?:${UTILITY})-(?:(?:${PALETTE})-(?:50|[1-9]00|950)|white|black)(?![\\w-])`,
    ),
  },
];

/** @type {import("eslint").Rule.RuleModule} */
export const noRawColor = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow raw colors in components; use semantic tokens.",
    },
    schema: [],
    messages: {
      hex: "Raw hex color `{{match}}`. Use a semantic token utility (bg-surface, text-negative-fg) or var(--ds-*).",
      colorFunction:
        "Raw color function `{{match}}`. Use a semantic token utility or var(--ds-*); color-mix() over var(--ds-*) is fine.",
      primitive:
        "Primitive scale variable `{{match}}`. Components read semantic tokens (--ds-*), never the scale.",
      palette:
        "Tailwind palette color `{{match}}`. It ignores the theme; use a semantic token utility instead.",
    },
  },
  create(context) {
    function check(node, text) {
      for (const { messageId, pattern } of CHECKS) {
        const found = pattern.exec(text);
        if (found) context.report({ node, messageId, data: { match: found[0] } });
      }
    }

    return {
      Literal(node) {
        if (typeof node.value === "string") check(node, node.value);
      },
      TemplateElement(node) {
        check(node, node.value.raw);
      },
      JSXText(node) {
        check(node, node.value);
      },
    };
  },
};

export default {
  meta: { name: "astraq-ui" },
  rules: { "no-raw-color": noRawColor },
};
