# @astraq/ui

Astraq's semantic design tokens and accessible React components.

## Principles

- Shared components consume semantic tokens, never raw theme palette values.
- `data-theme` selects brand identity; `data-mode` selects light or dark presentation.
- Native HTML is preferred for simple controls. Radix primitives provide behavior for composite controls.
- Product-specific trading patterns stay in `apps/web`.

## Commands

```bash
pnpm --filter @astraq/ui storybook
pnpm --filter @astraq/ui test:unit
pnpm --filter @astraq/ui typecheck
pnpm --filter @astraq/ui build-storybook
```

Storybook exposes `astraq`, `terminal`, and `midnight` themes in both light and dark modes.
