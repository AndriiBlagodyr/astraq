# Design System v2 — Implementation Plan

Implements [ADR 0002](decisions/0002-design-system-base-ui-and-token-architecture.md). The work is split into 7 PRs. Each PR must leave `pnpm lint typecheck test:unit build-storybook` green and must not visually break `apps/web`.

## Target structure

```
packages/ui/
├── scripts/
│   └── build-tokens.ts          # hand-built: TS themes -> CSS + DTCG JSON + registry
├── src/
│   ├── tokens/
│   │   ├── scale.ts             # OKLCH 12-step scale generator
│   │   ├── contrast.ts          # WCAG contrast + alpha flattening
│   │   ├── schema.ts            # SemanticTokens type (the theme contract)
│   │   ├── themes/
│   │   │   ├── forelume.ts  terminal.ts  midnight.ts
│   │   │   └── paper.ts   graphite.ts  contrast.ts
│   │   ├── contrast.test.ts     # every theme × mode × pair
│   │   └── generated/           # themes.css, tokens.json, registry.ts (committed, CI drift check)
│   ├── styles/
│   │   ├── index.css            # tailwind + @theme inline mapping + base layer
│   │   └── base.css
│   ├── lib/cn.ts
│   ├── theme/                   # ThemeProvider, ThemeScript, useTheme (registry-driven)
│   ├── components/
│   │   └── button/
│   │       ├── button.tsx
│   │       ├── button.stories.tsx
│   │       └── index.ts
│   └── index.ts
├── tsdown.config.ts
└── CHANGELOG.md
```

## Component conventions (apply to every component)

- **React 19 refs:** `ref` is a normal prop; no `forwardRef`.
- **Styling hooks:** every rendered part gets a `data-slot="button"` (or similar) attribute. `className` is merged last with `cn()`.
- **Variants:** use CVA and export `xVariants` so apps can style links as buttons, etc.
- **Composition:** use Base UI's `render` prop, not `asChild`.
- **No outer margins.** Layout is the parent's job.
- **Consistent props:** sizes are `sm | md | lg` and read density tokens. Every component uses the same prop names for intent: `variant`, `size`, `tone`.
- **States in stories:** default, hover, focus-visible, active, disabled, invalid (`aria-invalid`), loading, and read-only where relevant. Every state must appear in stories.
- **Server Components by default.** Add `"use client"` only to files that need it; display components stay RSC-safe.
- **Tests: minimal for now.** Check keyboard and ARIA behavior by hand in Storybook, and give every variant a story. Only add an automated test for rules that break silently and are hard to spot by eye, such as token contrast.

## PR 1 — Extraction hygiene and restructure ✅

1. Remove `@source "../../../../apps/web/**"` from `packages/ui/src/styles/index.css`. Add `@source` for `apps/web` in the web app's own CSS entry instead.
2. Split `core.tsx` / `overlays.tsx` into per-component folders. Move `cn` to `lib/`.
3. Add a temporary hand-written `THEMES` registry. Use it in `theme.tsx`, `theme-script.tsx`, and Storybook `preview.tsx` instead of the three hardcoded unions.
4. Add `ColorModePreference = "light" | "dark" | "system"`. Resolve `system` in ThemeScript and follow `matchMedia` changes.

**Done when:** the public exports are a superset of the old ones, all tests pass, and web renders unchanged.

**Also shipped in PR 1:**
- Full interaction-state pass on the existing components: hover, focus-visible, active, disabled, `aria-disabled`, invalid, and read-only.
- `Button loading`, `Tr`, `DialogClose`/`DialogFooter`, and `Select` groups, labels, and separators.
- `FormField` now wires `aria-describedby`, `aria-invalid`, and `required` into its control.
- Overlay enter/exit keyframes, and a contrast-tuned `--ds-focus-ring` token.
- Keyboard tests for every interactive component, plus `States` stories using `storybook-addon-pseudo-states`.

**Status text contrast (fixed after PR 1):** base hues are for fills. Text and icons now use `--ds-{brand,brand-strong,positive,negative,warning}-fg`, which keep the base hue in OKLCH and adjust lightness per theme × mode. `tokens/fg-contrast.test.ts` checks each of them against every surface and the tone's own 8–24% tint, at 4.5:1 or better. PR 2 generalizes this into the full contrast matrix.

## PR 2 — Token pipeline (hand-built)

1. `schema.ts`: define the semantic contract.
   - **Backgrounds:** `bg.canvas`, `bg.subtle`, `bg.surface`, `bg.raised`, `bg.overlay`, `bg.sunken`, `bg.inverse`.
   - **Foreground:** `fg.default`, `fg.muted`, `fg.subtle`, `fg.disabled`, `fg.onAccent`, `fg.inverse`.
   - **Borders:** `border.subtle`, `border.default`, `border.strong`, `border.focus`.
   - **Accent:** `accent.base`, `accent.hover`, `accent.active`, `accent.subtle`, `accent.fg`.
   - **Status:** `positive`, `negative`, `warning`, `info`, each with `base`, `subtle`, `fg` and `border`.
   - **Charts:** `chart.1` … `chart.8` (categorical), plus `chart.grid` and `chart.axis`.
   - **Effects:** `shadow.sm`, `shadow.md`, `shadow.lg`, `shadow.accent`; `gradient.brand`, `gradient.page`, `gradient.surface`.
   - **Shape:** `radius.control`, `radius.card`, `radius.pill`.
   - **Type:** `font.sans`, `font.display`, `font.mono`.
   - **Layout and motion:** `density.*`, `motion.*`.
2. `scale.ts`: generate 12-step OKLCH scales from a hue and chroma. Steps 1–2 are backgrounds, 3–5 interactive fills, 6–8 borders, 9–10 solid fills, and 11–12 text. The light and dark curves are separate.
3. `contrast.ts`: WCAG 2.2 relative luminance, with alpha compositing over `bg.canvas` for translucent tokens.
4. `build-tokens.ts`: emit `generated/themes.css`, `tokens.json` (W3C DTCG format), and `registry.ts`. Wire it into `build`, and add a CI check that the generated files are current.
5. Port `forelume`, `terminal`, and `midnight` into TS. Their **light and dark neutrals now differ per theme**.
6. `contrast.test.ts`: required pairs per theme × mode:
   - `fg.*` on every `bg.*` (4.5:1; 3:1 for `fg.subtle`, which is reserved for large or non-essential text);
   - `accent.fg` on `accent.base`;
   - each status `fg` on its `subtle`;
   - `border.focus` against `bg.canvas` and `bg.surface` (3:1);
   - `chart.*` against `bg.surface` (3:1).
7. Update the `@theme inline` mapping to the new names. Keep the old `--ds-*` names as aliases for this PR only.

**Learning focus:** color science (OKLCH vs. sRGB), perceptual scales, codegen, testing design constraints.

## PR 3 — Base UI migration

1. Add `@base-ui/react` and remove all `@radix-ui/*` packages.
2. Rewrite Dialog, Select, Tabs, and Tooltip on Base UI.
   - Map `data-[state=…]` selectors to Base UI attributes.
   - Move enter/exit animations to `data-starting-style` / `data-ending-style`.
   - Replace `TooltipProvider` with the Base UI provider, re-exported under the same name.
3. Keep the exported component names stable so `apps/web` doesn't change.
4. Check each migrated component by hand in Storybook: Escape, focus return, arrow keys, typeahead. The existing PR 1 keyboard tests must keep passing.

## PR 4 — Themes to 6 + density

| Theme | Identity | Type | Radius | Surfaces | Default density |
|---|---|---|---|---|---|
| `forelume` | Cyan → indigo → gold; the flagship | Geist / Sora | Large (12–24px) | Glass, gradients | comfortable |
| `terminal` | Phosphor green + amber; Bloomberg-style | Mono display, Geist body | 2–4px | Flat, no blur, hairline borders | compact |
| `midnight` | Violet + pink; soft, night-trading | Geist / Sora | Large | Soft gradients | comfortable |
| `paper` | Warm off-white / ink; editorial research reports. Dark = sepia night | Serif display (Fraunces), Geist body | 6px | Opaque, no gradients, hairline rules | comfortable |
| `graphite` | Neutral monochrome with one restrained blue accent | Geist | 6–8px | Opaque, subtle shadows | comfortable |
| `contrast` | Accessibility first: AAA text | System sans | 4px | Opaque only, 2px borders, 3px focus ring, underlined links | comfortable |

- Add `data-density` (`comfortable` | `compact`). Control heights, paddings, and table row heights read density tokens.
- Add a `forced-colors: active` block in base styles, using system colors and keeping focus rings visible.
- Add a theme and density toolbar in Storybook, plus a "Theme matrix" story that shows one composition in all 12 theme × mode combinations side by side.

## PR 5 — Component expansion

Build components in tiers, each wrapping Base UI unless noted.

- **Tier A (forms):** Field (label, description, error wiring), Input, Textarea, Checkbox, CheckboxGroup, RadioGroup, Switch, Select (restyled), Combobox, Autocomplete, NumberField, Slider, Toggle, ToggleGroup, Form. **SegmentedControl is hand-built** (ADR 0002 §6).
- **Tier B (overlays and feedback):** Popover, Menu, ContextMenu, AlertDialog, Drawer (Dialog variant), Toast, PreviewCard, Progress, Meter, Skeleton, Spinner.
- **Tier C (display):** Avatar, Separator, ScrollArea, Kbd, Accordion, Collapsible, Toolbar, EmptyState, Stat (generic label/value/delta; no market semantics).
- **Tier D (data):** the Table primitive restyled with density and sticky headers, a DataTable recipe (TanStack Table + Virtual, supporting sort, column visibility, and row selection), and DateRangePicker (React Aria, wrapped).

## PR 6 — Distribution

1. `tsdown.config.ts`:
   - output ESM with `.d.ts`;
   - preserve `"use client"` directives;
   - add a per-component entry for tree-shaking;
   - output CSS as `dist/styles.css` (full: Tailwind plus the mapping) and `dist/tokens.css` (variables only, for non-Tailwind consumers).
2. Point `exports` at `dist`, and set `sideEffects: ["*.css"]`.
3. Remove `transpilePackages` from `apps/web` if it's no longer needed.
4. Add Changesets at the repo root, then the first changeset: `0.2.0`.
5. Write a "Consuming @astraq/ui" section in the README covering the CSS import, the `@source` line, font loading, ThemeScript in `<head>`, and how to add a custom theme.

## PR 7 — Docs and cleanup

1. Storybook docs pages: Introduction, Tokens (live swatches from `tokens.json`), Themes, Accessibility, Contributing (the component checklist above).
2. A lint rule that fails if `components/**` contains a hex, `rgb(`, `oklch(`, or `--p-*` reference.
3. Delete the transitional aliases in `styles/index.css` once the `layout.module.css` migration (Phase 0 follow-up) is complete.

## Out of scope

- Charts: they live in `apps/web`, but they consume the `chart.*` tokens.
- Trading patterns such as order tickets, the order book, and PnL cells: `apps/web`.
- Publishing to npm: only when a second consumer exists.
- Figma sync: `tokens.json` makes it possible later.
- Visual regression tests and broad test coverage: deferred for now. Revisit once the component set stabilizes.
