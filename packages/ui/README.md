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

Storybook's toolbar switches every registered theme and mode. Use the pseudo-states toolbar (or the `States` stories) to review hover, focus, and active states.

## Structure

```
src/
├── components/<name>/   # <name>.tsx, <name>.stories.tsx, index.ts
├── theme/               # registry (single source of theme names), provider, head script
├── tokens/              # semantic CSS variables per theme and mode
├── styles/              # Tailwind entry, token mapping, motion keyframes, base layer
├── stories/             # cross-component compositions and story helpers
└── lib/cn.ts
```

Add a theme by registering it in `theme/registry.ts` and defining its tokens. The provider, head script, Storybook, and apps read the registry.

## Component checklist

Every component must:

- **Styling hooks:** render `data-slot="<name>"`, merge `className` last with `cn()`, and set no outer margins.
- **Styling source:** read semantic tokens only. No raw colors.
- **Tone colors:** colored text and icons use the `*-fg` tokens (`text-negative-fg`). Base tone tokens (`bg-negative/12`, `border-negative/35`) are for fills and borders only, because they're too pale to read as text in light mode.
- **Interaction states:** style every state that applies: hover, `focus-visible`, active, disabled (`disabled` and `aria-disabled`), invalid (`aria-invalid`), loading, read-only.
- **Focus:** keep the global `:focus-visible` ring, or replace it with an equally visible one. Never remove focus without replacing it.
- **Motion:** only transform when `motion-safe`. Durations come from `--ds-motion-*`, which drop to 0ms under reduced motion.
- **Keyboard:** support the WAI-ARIA pattern for its role, and check it by hand in Storybook. New tests aren't required for now.
- **Stories:** have a `States` story that shows every state.
- **Client code:** add `"use client"` only when the file needs hooks or browser APIs.

## Consuming

```css
/* app/globals.css */
@import "@astraq/ui/styles.css";
@source "./"; /* the package scans only itself; declare your own sources */
```

Render `<ThemeScript />` in `<head>` to apply the stored theme before first paint. Then wrap the app in `ThemeProvider` and `TooltipProvider`.
