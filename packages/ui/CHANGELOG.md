# @astraq/ui

## 0.2.0

### Minor Changes

- caa52ce: Ship `@astraq/ui` as a built package.
  
  - `exports` point at `dist`: unbundled ESM with `.d.ts`, and every `"use client"` directive kept on its own file.
  - Each component is its own entry (`@astraq/ui/button`, `@astraq/ui/data-table`, ...), as are `@astraq/ui/theme`, `@astraq/ui/motion` and `@astraq/ui/cn`. The root `@astraq/ui` still exports everything.
  - `@astraq/ui/styles.css` is the Tailwind entry (Tailwind, the token mapping and the base layer), compiled by the app's own Tailwind. `@astraq/ui/tokens.css` holds only the theme variables, for apps without Tailwind.
  - `sideEffects: ["*.css"]`, and `tailwindcss` 4 is a peer dependency.
- 322dd27: Docs pages, a raw-color lint rule, and the end of the transitional aliases.
  
  - Storybook has Docs pages: Introduction, Tokens (live from `tokens.json`), Themes, Accessibility (with contrast results per theme and mode) and Contributing.
  - `astraq-ui/no-raw-color` fails lint on hex colors, color functions, `--p-*` primitives or Tailwind palette classes in `src/components/**`.
  - **Breaking:** `styles.css` no longer defines the pre-v2 names apps/web's CSS modules read (`--color-text-primary`, `--gradient-brand`, ...). Read the `--ds-*` tokens instead (`--ds-fg-default`, `--ds-gradient-brand`, ...).
  - **Breaking:** the generated tokens no longer include the pre-PR 2 `--ds-*` aliases (`--ds-background`, `--ds-foreground`, `--ds-border`, ...). Use the semantic names (`--ds-bg-canvas`, `--ds-fg-default`, `--ds-border-default`).
