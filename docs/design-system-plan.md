# Design System v2 — Implementation Plan

Implements [ADR 0002](decisions/0002-design-system-base-ui-and-token-architecture.md). The work is split into 7 PRs. PR 5 ships as four PRs, one per tier (5a–5d). Each PR must leave `pnpm lint typecheck test:unit build-storybook` green and must not visually break `apps/web`.

## Target structure

```
packages/ui/
├── scripts/
│   └── build-tokens.ts          # hand-built: TS themes -> CSS + DTCG JSON + registry
├── src/
│   ├── tokens/
│   │   ├── color.ts             # sRGB <-> OKLCH, gamut clipping
│   │   ├── contrast.ts          # WCAG contrast, alpha flattening, lightness solver
│   │   ├── scale.ts             # OKLCH 12-step scale generator
│   │   ├── schema.ts            # the theme contract + semantic token names
│   │   ├── resolve.ts           # seeds -> semantic tokens per mode
│   │   ├── emit.ts              # CSS, DTCG JSON, runtime registry
│   │   ├── themes/
│   │   │   ├── forelume.ts  terminal.ts  midnight.ts
│   │   │   └── paper.ts   graphite.ts  contrast.ts   (PR 4)
│   │   ├── contrast.test.ts     # every theme × mode × pair
│   │   ├── index.css            # generated token CSS (committed)
│   │   └── generated/           # tokens.json, registry.ts (committed)
│   ├── styles/
│   │   └── index.css            # tailwind + @theme inline mapping + base layer
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
- **Motion:** follow the rules in [motion-and-delight-plan.md](motion-and-delight-plan.md): tokens only, transitions over keyframes, exits faster than entries, reduced motion respected.
- **Server Components by default. Add `"use client"` only to files that need it; display components stay RSC-safe.
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

## PR 2 — Token pipeline (hand-built) ✅

**What shipped**
- **Seeds, not palettes:** each theme in `tokens/themes/*.ts` is a small set of seeds: a neutral hue and chroma, brand colors plus gradient stops, and status colors. `resolve.ts` derives every semantic token for light and dark.
- **Full palette per theme (option 1):** neutrals come from a hue-tinted OKLCH 12-step scale, so backgrounds, surfaces, borders, text and shadows now differ per theme. The curves are fitted to the original Forelume values, so the default theme looks the same.
- **Contrast by construction:** text, focus-ring and chart colors are solved. Lightness moves until the color passes every surface it can sit on, including translucent surfaces flattened over the canvas and tone tints of 8–24%.
- **Committed outputs:** `pnpm --filter @astraq/ui tokens` writes `tokens/index.css`, `generated/tokens.json` (DTCG) and `generated/registry.ts`. `build` runs `tokens:check`, which fails when they're stale. That's the drift check to wire into CI once CI exists (Phase 0).
- **Test:** `contrast.test.ts` replaces `fg-contrast.test.ts`, with 114 checks across 3 themes × 2 modes.

**Semantic tokens** (`--ds-*`):
- **Backgrounds:** `bg-{canvas,subtle,surface,raised,sunken,overlay}`
- **Text:** `fg-{default,muted,subtle,on-brand}`
- **Borders:** `border-{subtle,default,strong}`
- **Focus:** `focus-{ring,halo}`
- **Brand and status:** `brand`, `brand-strong`, `brand-warm`, `positive`, `negative`, `warning`, each with a `*-fg` text variant
- **Charts:** `chart-1…8`, `chart-grid`, `chart-axis`
- **Effects:** `shadow-{soft,brand}`, `gradient-{brand,page,surface}`

Fonts, radii and motion are shared across themes.

**Deliberate differences from the original plan**
- **Primitives:** the 12-step ramps go to `tokens.json` only, not CSS. That structurally enforces "components never reference primitives".
- **Utility names:** Tailwind utility names stay the same (`bg-surface`, `text-muted`, …) and only their mapping changed, so component classes didn't churn. `brand` stays the accent name; no `accent.*` rename.
- **Deferred tokens:** `bg-inverse`, `fg-disabled`, `info`, and hover/active tone steps have no consumer yet. Add them when a component needs them.
- **`fg-subtle` bar:** it must reach 4.5:1, not 3:1, because hints and table headers use it. Light-mode `fg-subtle` darkened from `#7f93b0` (~3:1) to `#596c88`.
- **Midnight gradient:** the middle stop moved from `#725cff` to `#7562fe`, because button text only reached 4.44:1 on it.
- **Legacy names:** pre-PR 2 `--ds-*` names remain as aliases in the generated CSS, for `apps/web`. Remove them in PR 7.

**Learning focus:** color science (OKLCH vs. sRGB), perceptual scales, codegen, testing design constraints.

## PR 3 — Base UI migration ✅

1. Add `@base-ui/react` and remove all `@radix-ui/*` packages.
2. Rewrite Dialog, Select, Tabs, and Tooltip on Base UI.
   - Map `data-[state=…]` selectors to Base UI attributes.
   - Move enter/exit animations to `data-starting-style` / `data-ending-style`.
   - Replace `TooltipProvider` with the Base UI provider, re-exported under the same name.
3. Keep the exported component names stable so `apps/web` doesn't change.
4. Check each migrated component by hand in Storybook: Escape, focus return, arrow keys, typeahead. The existing PR 1 keyboard tests must keep passing.

**What shipped**
- `@base-ui/react` 1.8. All four Radix packages are removed, and the export names are unchanged. `apps/web` only uses `TooltipProvider` and needed no edits.
- **Composition:** `asChild` is replaced by `render`, as in `<DialogTrigger render={<Button />}>Review order</DialogTrigger>`.
- **Motion:** overlays use CSS transitions on `data-starting-style` / `data-ending-style` instead of keyframes, so an interrupted open or close reverses smoothly. The `animate-ds-*` keyframes are deleted. Durations still read motion tokens, which are 0ms under reduced motion.
- **New prop types:** `TabsListProps`, `TabsTriggerProps`, `TabsContentProps`, `SelectContentProps`, `SelectItemProps`, `SelectLabelProps`, `SelectSeparatorProps`.

**Behavior differences**
- **Select labels:** Base UI shows the raw value in the trigger unless `Select` gets `items`, a value → label map or a `{ value, label }[]`. Pass `items` whenever values aren't display text.
- **Select position:** `alignItemWithTrigger={false}` keeps the Radix layout, with the list opening below the trigger instead of overlapping it.
- **Tabs:** `TabsList` sets `activateOnFocus` to keep automatic activation. Disabled tabs now stay focusable with the arrow keys (`aria-disabled`) but never activate.
- **Tooltip:** Base UI treats tooltips as visual-only. Our wrapper adds `role="tooltip"` and points the trigger's `aria-describedby` at it while open, so screen readers still get the description. `children` is now typed `ReactElement`.
- **Tests:** jsdom needed a `PointerEvent` shim (in `test/setup.ts`). The Dialog focus-wrap test now waits one tick, because Base UI wraps focus through a focus-guard element.

## PR 4 — Themes to 6 + density ✅

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
- Add the theme switch reveal (see [motion-and-delight-plan.md](motion-and-delight-plan.md)).
- Add a theme and density toolbar in Storybook, plus a "Theme matrix" story that shows one composition in all 12 theme × mode combinations side by side.

**What shipped**
- **Theme contract:** `ThemeSource` now also sets:
  - `type` (sans, display, mono)
  - `shape` (radii plus `pill`, border width, focus-ring width)
  - `surfaces` (`glass` | `opaque` | `flat`)
  - `density`
  - `contrast` (`AA` | `AAA`)
  - `links` (`plain` | `underline`)

  These emit as per-theme `--ds-*` tokens. The old shared font and radius tokens are gone.
- **Themes:** `paper`, `graphite` and `contrast` are added. `terminal` becomes flat, with a solid primary fill, mono display face, 2–4px radii and compact default density. Forelume and Midnight colors are byte-identical to PR 2.
- **Surfaces:** `opaque` and `flat` themes get solid surfaces, flat page and card backgrounds, and no blur. `opaque` has subtle shadows, and `flat` has no shadows at all.
- **Contrast level:** the `contrast` theme is solved to AAA: 7:1 text, and 4.5:1 for non-text including solid borders. `contrast.test.ts` checks each theme at its own level, with 234 checks in total.
- **Density:** `DENSITY_TOKENS` cover control heights, inline padding and table cell padding. They map to Tailwind as `min-h-control-*`, `px-inset-*`, `py-cell-y` and `py-head-y`.
  - Resolution order: the theme's default, then `[data-density]`.
  - `ThemeProvider` exposes `density`, `densityPreference` and `setDensity("comfortable" | "compact" | "theme")`.
  - `ThemeScript` applies a stored choice before first paint.
- **Utilities:**
  - `rounded-pill` replaces `rounded-full` on buttons, badges and tabs. Spinner keeps `rounded-full`.
  - The bare `border` width reads `--ds-border-width` (via `--default-border-width`).
  - `backdrop-blur-surface` and `backdrop-blur-overlay` replace fixed blurs.
- **Scoped themes:** selectors match any element (`[data-theme="x"]`), not only `:root`, so a subtree can carry its own theme and mode.
- **Accessibility:**
  - A `forced-colors` block restores focus outlines and marks active tabs, highlighted options and selected rows with system colors.
  - Focus width reads `--ds-focus-width`.
  - Inline links (`a:not([data-slot])`) follow `--ds-link-decoration`.
- **Theme switch reveal:** `setTheme`, `setMode` and `toggleMode` run inside a View Transition, with a circular reveal from the focused control. It's instant without View Transitions or under reduced motion.
- **Storybook:** a density toolbar and **Overview/Theme matrix**.
- **Fixes:** `theme/theme-test.tsx` never matched Vitest's `*.test.tsx` pattern, so the ThemeProvider tests never ran. It's renamed to `theme.test.tsx`, and the tests now run, plus a new density test.

**Deliberate differences**
- **Fonts:** Fraunces, JetBrains Mono, Geist and Sora are named in the stacks but not loaded. Loading them is part of PR 6's "Consuming" README. Until then, each theme falls back to the next font in its stack.
- **`fg-on-brand` test:** it now checks only the brand gradient stops, the primary button fill. That's the only place on-brand text sits, and solid themes repeat one color across the stops.

## PR 5 — Component expansion

Build components in tiers, each wrapping Base UI unless noted. Motion requirements for `Skeleton`, `Toast`, `Drawer`, `EmptyState`, plus the new spring presets and `AnimatedNumber`, are in [motion-and-delight-plan.md](motion-and-delight-plan.md).

Each tier is its own PR, and the next starts after the previous one merges:

- **PR 5a — Tier A (forms) ✅:** Field (label, description, error wiring), Input, Textarea, Checkbox, CheckboxGroup, RadioGroup, Switch, Select (restyled), Combobox, Autocomplete, NumberField, Slider, Toggle, ToggleGroup, Form. **SegmentedControl is hand-built** (ADR 0002 §6).
- **PR 5b — Tier B (overlays and feedback):** Popover, Menu, ContextMenu, AlertDialog, Drawer (Dialog variant), Toast, PreviewCard, Progress, Meter, Skeleton, Spinner.
- **PR 5c — Tier C (display):** AnimatedNumber and the spring presets, Avatar, Separator, ScrollArea, Kbd, Accordion, Collapsible, Toolbar, EmptyState, Stat (generic label/value/delta; no market semantics).
- **PR 5d — Tier D (data):** the Table primitive restyled with density and sticky headers, a DataTable recipe (TanStack Table + Virtual, supporting sort, column visibility, and row selection), and DateRangePicker (React Aria, wrapped).

### PR 5a — what shipped

- **Field on Base UI:** `Field`, `FieldLabel`, `FieldDescription`, `FieldError`, `FieldItem`, `FieldValidity`, `Fieldset`/`FieldsetLegend`, and `Form`, all wrapping Base UI.
  - Base UI links label, control, description and error for every control in the package, including Select, Combobox, NumberField and Slider. It sets `aria-invalid` and `data-invalid` from the field's validity.
  - `FormField` stays as the one-element shorthand, rebuilt on these parts.
  - `Field required` is ours: Base UI has no field-level required. A small context carries it to the label's asterisk and to each control's `required`.
- **Controls:** Input moves onto Base UI `Input`. Textarea renders `Field.Control` as a `<textarea>`, with optional `autoResize` (`field-sizing`).
  - Checkbox has indeterminate and `parent` select-all. CheckboxGroup, RadioGroup/Radio, Switch.
  - Combobox has single, grouped, and `multiple` with removable chips (`ComboboxChipsInput`). Autocomplete allows free text with suggestions.
  - NumberField has steppers and Intl `format`. Slider handles single, range, and vertical, with `SliderLabel` and `SliderValue`. Toggle has `ghost | outline` variants and ToggleGroup handles single or multiple.
- **Shared styles:** `controlVariants({ size })` gives every text-like control `sm | md | lg` on density tokens. `controlClassName` stays as the `md` alias. Select, Combobox and Autocomplete share one listbox look from `lib/listbox.ts`, and Select was refactored onto it.
- **SegmentedControl (hand-built):** WAI-ARIA radio group with a roving tabindex. Arrow keys move and check, wrapping and skipping disabled segments. Left and Right flip in RTL, and Home/End jump to the ends. Segments are equal width, so the indicator slides with `translate` only, and never on first paint.
- **New tokens:**
  - `bg-checked` fills checked checkboxes, radios, switches and sliders. `border-control` draws their unchecked edges. Both are solved to the non-text bar on every surface. Before this, only the fill and hairline showed state, and neither was guaranteed 3:1.
  - `fg-on-checked` is whichever ink reads best on `bg-checked`.
  - `contrast.test.ts` checks all three, for 270 checks in total.
- **Accessibility:**
  - forced-colors rules for checked, pressed and highlighted states, radio dots, switch thumbs and slider fills.
  - Listbox popups blur what's behind them on glass themes (`backdrop-blur-overlay`, 0px on solid themes).
- **Tests:** one new file, `segmented-control.test.tsx`, covers the hand-built keyboard pattern. The Field and Select tests were updated to the new API.

**Deliberate differences**
- **FormField API:** `htmlFor` is gone, because Base UI generates and links ids. `hint` is renamed `description` to match the parts. The description now stays visible when an error shows. `useFieldControl` is removed; the Base UI field context replaces it. Nothing in `apps/web` used them.
- **Checkbox corners:** they use half the theme's `radius-sm`, so forelume's 12px radius doesn't turn checkboxes into circles.
- **SegmentedControl and Form:** it isn't a Base UI control, so a FieldLabel can't point at it, and `onFormSubmit` doesn't include its value. It submits through `name` in native `FormData`.
- **Spring presets:** moved to 5c with `AnimatedNumber`, their first consumer.

**Fixed after 5a** (found by an axe + computed-style pass over the built Storybook in Chrome):
- **Checked tokens weren't mapped:** `bg-checked`, `border-control` and `fg-on-checked` existed as `--ds-*` variables but not in the `@theme inline` block, so `bg-checked`, `border-border-control` and `text-on-checked` produced no CSS. Checked checkboxes, radios, switches and slider fills had no fill. The forced-colors rules for those states were also missing. Both are now in `styles/index.css`.
- **`read-only:` on non-inputs:** `:read-only` matches every non-editable element, so the Select trigger (a button) and the Combobox, Autocomplete and NumberField groups (divs) were always transparent, with no hover border. `controlVariants` now scopes it to `input`/`textarea` and uses `data-readonly` for the rest.
- **Switch thumb:** it was off-center by 2px when checked in themes with 1px borders. Padding now subtracts `--ds-border-width`, so the thumb sits 4px from every edge.
- **CheckboxGroup in a required Field:** each box inherited `required`, which demands every box is checked. The group now stops the Field's `required` from reaching its boxes.
- **Loading Button (PR 1):** `invisible` removed the label from the accessibility tree, so axe flagged `button-name`. It now hides the label with a transparent color and zero opacity instead.

### PR 5b — what shipped

- **Overlays:**
  - `Popover` (with `PopoverTitle` / `PopoverDescription`, optional `arrow`). It's a labelled `dialog`, and focus moves into it.
  - `Menu`, with items, link items, checkbox and radio items, groups and labels, separators, `MenuShortcut` hints, and submenus (`MenuSub`, `MenuSubTrigger`, `MenuSubContent`). `MenuItem tone="danger"` marks destructive actions. `inset` lines plain items up with checkbox and radio items.
  - `ContextMenu` reuses the Menu item parts, as Base UI does. It adds only `ContextMenuTrigger` and `ContextMenuContent`.
  - `PreviewCard`, a hover and focus preview for links. It's never announced, so it can only repeat what's on the linked page.
- **Modals:**
  - `AlertDialog` (`role="alertdialog"`). The backdrop doesn't dismiss it, it has no close icon, and `description` is required. Put Cancel first, so it takes initial focus.
  - `Drawer` (`side`: `right | left | bottom`) on Base UI's Drawer, not a restyled Dialog: it gets drag-to-dismiss, backdrop fade tied to the drag, and flick-speed exit timing. Side panels have a close icon; the bottom sheet has a drag handle instead.
- **Feedback:**
  - `ToastProvider` + `useToastManager` / `createToastManager`. `type` is the tone (the same icons and colors as `Feedback`), `actionProps` makes an undo button, and `priority: "high"` announces failures right away. Toasts stack, fan out on hover or focus, pause while hovered, and dismiss with a swipe right or down. F6 moves focus into the stack.
  - `Progress` (determinate, or indeterminate with `value={null}`) and `Meter`, sharing one bar style. `tone` is up to the caller.
  - `Skeleton` and `SkeletonText`. They're RSC-safe, hidden from assistive tech, and their shimmer is removed under reduced motion.
  - `Spinner` gains `size` (`sm | md | lg`); `md` is the old look.
- **Shared styles:**
  - `lib/popup.ts` holds the anchored-popup surface, the enter/exit motion (it slides away from the anchor on any side), and arrow placement. `lib/popup-arrow.tsx` is the arrow SVG.
  - `lib/overlay.ts` holds the modal backdrop, card, title, description and footer.
  - Dialog and Tooltip now use these too, with the same rendered classes as before.
- **Motion:** everything runs on motion tokens, including the Drawer and Toast recipes, whose Base UI examples hardcode 450–500ms. So reduced motion makes overlays instant. The two loaders keep moving under reduced motion because they're the only sign of activity: the indeterminate Progress runs at half speed, and Spinner is unchanged. They're the only new keyframes (`ds-shimmer`, `ds-progress-sweep`).
- **Accessibility:**
  - forced-colors rules for highlighted menu items (including their icons and shortcut hints), open submenu triggers, menu separators, progress and meter fills, and skeleton outlines.
  - Progress and Meter fills use `bg-checked` and the `*-fg` tone colors. Those are solved to 3:1 on every surface, unlike the raw brand hue: cyan on a light surface is too faint.

**Deliberate differences**
- **Drawer:** it's built on Base UI's Drawer, not the "Dialog variant" this plan named. The Drawer primitive shipped in Base UI 1.x and supplies the drag-to-dismiss from the motion plan.
- **Toast API:** there's no wrapper over Base UI's manager. `add`, `update`, `close` and `promise` are used as-is, and `type` carries the tone. A second, parallel API would only rename options.
- **Menu sizing:** items use `min-h-control-sm`, so compact density tightens menus with the rest of the controls.
- **Tailwind sources:** `styles/index.css` now scans `lib/` as well. Classes that exist only in `lib/*.ts` (all of `popup.ts` and `overlay.ts`) were otherwise never generated.

**Checked by hand** in Chrome against Storybook, in the default theme plus Paper, Midnight, Terminal and High contrast, light and dark:
- **Keyboard:** Popover, Menu (arrows, submenus, End, Escape), ContextMenu (right-click at the pointer, Shift+F10), AlertDialog (backdrop ignored, Cancel focused), Drawer (focus trap, Escape, drag to dismiss), Toast (pause on hover, F6, undo), PreviewCard (opens on hover and focus). Focus returns to the trigger every time.
- **axe:** no component-level violations. The only findings are page-level rules (no `main`, no `h1`) that come from the bare story iframe.
- **Reduced motion and forced colors:** both emulated in Chrome.

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
