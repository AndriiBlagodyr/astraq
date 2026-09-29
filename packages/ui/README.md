# @astraq/ui

Astraq's semantic design tokens and accessible React components.

## Principles

- Shared components consume semantic tokens, never raw theme palette values.
- `data-theme` selects brand identity (color, type, radius, surfaces); `data-mode` selects light or dark; `data-density` (`comfortable` | `compact`) overrides the theme's default sizing.
- Native HTML is preferred for simple controls. Base UI primitives provide behavior for composite controls.
- Product-specific trading patterns stay in `apps/web`.

## Commands

```bash
pnpm --filter @astraq/ui storybook
pnpm --filter @astraq/ui test:unit
pnpm --filter @astraq/ui typecheck
pnpm --filter @astraq/ui build-storybook
```

Storybook's toolbar switches every registered theme, mode and density. **Overview/Theme matrix** shows one composition in every theme × mode. Use the pseudo-states toolbar (or the `States` stories) to review hover, focus, and active states.

## Structure

```
src/
├── components/<name>/   # <name>.tsx, <name>.stories.tsx, index.ts
├── theme/               # registry (single source of theme names), provider, head script
├── tokens/              # semantic CSS variables per theme and mode
├── styles/              # Tailwind entry, token mapping, base layer, forced-colors
├── stories/             # cross-component compositions and story helpers
└── lib/                 # cn(), WithClassName, shared listbox styles
```

### Tokens and themes

Themes are authored as seeds in `src/tokens/themes/*.ts`: color seeds, plus type, shape (radii, border and focus-ring width), surface style (`glass` | `opaque` | `flat`), default density, and a contrast level. The build derives every semantic token (`--ds-bg-*`, `--ds-fg-*`, `--ds-border-*`, brand, status, charts, effects) for light and dark. It solves text, focus and chart colors so they pass the theme's WCAG level (AA, or AAA for `contrast`) on every surface.

Checked controls get their own solved tokens: `bg-checked` (checked checkbox, radio, switch, slider fill) and `border-control` (their unchecked edges) clear the non-text bar on every surface, and `fg-on-checked` (checkmarks, thumbs) clears it on `bg-checked`.

Theme selectors match any element, so a subtree can set its own `data-theme` / `data-mode`.

```bash
pnpm --filter @astraq/ui tokens        # regenerate after editing a theme
pnpm --filter @astraq/ui tokens:check  # fails if committed outputs are stale (runs in build)
```

To add a theme:
1. Write `src/tokens/themes/<name>.ts`.
2. List it in `themes/index.ts`.
3. Run `pnpm tokens`.

The provider, head script, Storybook and apps pick it up from the generated registry. `tokens/index.css` and `tokens/generated/*` are generated, so never edit them by hand.

### Forms

Wrap a control in `Field` (or the `FormField` shorthand) and Base UI wires the rest: the label names the control, and the description and any visible `FieldError` join its `aria-describedby`. `Field required` adds the asterisk and sets `required` on the control. `Field invalid` marks it invalid. Server errors go on `Form errors`, keyed by each Field's `name`.

```tsx
<Form onFormSubmit={save} errors={serverErrors}>
  <FormField name="symbol" label="Symbol" description="Ticker, e.g. AAPL" required>
    <Input />
  </FormField>
  <Field name="sessions">
    <Fieldset render={<CheckboxGroup />}>
      <FieldsetLegend>Sessions</FieldsetLegend>
      <FieldItem>
        <Checkbox value="pre" />
        <FieldLabel>Pre-market</FieldLabel>
      </FieldItem>
    </Fieldset>
  </Field>
</Form>
```

Every Field part (`FieldLabel`, `FieldItem`, ...) must sit inside a `Field`. SegmentedControl is hand-built rather than a Base UI control. Name it with `aria-label` / `aria-labelledby`. It submits through `name` in native `FormData`, so read `FormData` in `onSubmit` if you need its value.

## Component checklist

Every component must:

- **Styling hooks:** render `data-slot="<name>"`, merge `className` last with `cn()`, and set no outer margins.
- **Styling source:** read semantic tokens only. No raw colors.
- **Shape and size:** use `rounded-sm…xl` or `rounded-pill` (never `rounded-full`, except true circles), and density sizing for controls and cells (`min-h-control-md`, `px-inset-md`, `py-cell-y`), so themes and `data-density` can restyle them.
- **Tone colors:** colored text and icons use the `*-fg` tokens (`text-negative-fg`). Base tone tokens (`bg-negative/12`, `border-negative/35`) are for fills and borders only, because they're too pale to read as text in light mode.
- **Interaction states:** style every state that applies: hover, `focus-visible`, active, disabled (`disabled` and `aria-disabled`), invalid (`aria-invalid`), loading, read-only.
- **Focus:** keep the global `:focus-visible` ring, or replace it with an equally visible one. Never remove focus without replacing it.
- **Motion:** follow [docs/motion-and-delight-plan.md](../../docs/motion-and-delight-plan.md). Only transform when `motion-safe`. Durations come from `--ds-motion-*`, which drop to 0ms under reduced motion.
- **Keyboard:** support the WAI-ARIA pattern for its role, and check it by hand in Storybook. New tests aren't required for now.
- **Stories:** have a `States` story that shows every state.
- **Client code:** add `"use client"` only when the file needs hooks or browser APIs.

## Consuming

```css
/* app/globals.css */
@import "@astraq/ui/styles.css";
@source "./"; /* the package scans only itself; declare your own sources */
```

Render `<ThemeScript />` in `<head>` to apply the stored theme, mode and density before first paint. Then wrap the app in `ThemeProvider` and `TooltipProvider`.
