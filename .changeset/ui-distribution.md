---
"@astraq/ui": minor
---

Ship `@astraq/ui` as a built package.

- `exports` point at `dist`: unbundled ESM with `.d.ts`, and every `"use client"` directive kept on its own file.
- Each component is its own entry (`@astraq/ui/button`, `@astraq/ui/data-table`, ...), as are `@astraq/ui/theme`, `@astraq/ui/motion` and `@astraq/ui/cn`. The root `@astraq/ui` still exports everything.
- `@astraq/ui/styles.css` is the Tailwind entry (Tailwind, the token mapping and the base layer), compiled by the app's own Tailwind. `@astraq/ui/tokens.css` holds only the theme variables, for apps without Tailwind.
- `sideEffects: ["*.css"]`, and `tailwindcss` 4 is a peer dependency.
