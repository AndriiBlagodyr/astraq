---
"@astraq/ui": minor
---

Docs pages, a raw-color lint rule, and the end of the transitional aliases.

- Storybook has Docs pages: Introduction, Tokens (live from `tokens.json`), Themes, Accessibility (with contrast results per theme and mode) and Contributing.
- `astraq-ui/no-raw-color` fails lint on hex colors, color functions, `--p-*` primitives or Tailwind palette classes in `src/components/**`.
- **Breaking:** `styles.css` no longer defines the pre-v2 names apps/web's CSS modules read (`--color-text-primary`, `--gradient-brand`, ...). Read the `--ds-*` tokens instead (`--ds-fg-default`, `--ds-gradient-brand`, ...).
- **Breaking:** the generated tokens no longer include the pre-PR 2 `--ds-*` aliases (`--ds-background`, `--ds-foreground`, `--ds-border`, ...). Use the semantic names (`--ds-bg-canvas`, `--ds-fg-default`, `--ds-border-default`).
