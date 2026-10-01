# @astraq/ui

Astraq's semantic design tokens and accessible React components.

## Principles

- Shared components consume semantic tokens, never raw theme palette values.
- `data-theme` selects brand identity (color, type, radius, surfaces); `data-mode` selects light or dark; `data-density` (`comfortable` | `compact`) overrides the theme's default sizing.
- Native HTML is preferred for simple controls. Base UI primitives provide behavior for composite controls.
- Product-specific trading patterns stay in `apps/web`.

## Commands

```bash
pnpm --filter @astraq/ui build        # dist/: ESM, .d.ts, styles.css, tokens.css
pnpm --filter @astraq/ui dev          # the same build, in watch mode
pnpm --filter @astraq/ui storybook
pnpm --filter @astraq/ui test:unit
pnpm --filter @astraq/ui typecheck
pnpm --filter @astraq/ui build-storybook
```

Storybook opens on the **Docs** pages (see below). Its toolbar switches every registered theme, mode and density. **Overview/Theme matrix** shows one composition in every theme × mode. Use the pseudo-states toolbar (or the `States` stories) to review hover, focus, and active states.

## Structure

```
src/
├── components/<name>/   # <name>.tsx, <name>.stories.tsx, index.ts
├── theme/               # registry (single source of theme names), provider, head script
├── tokens/              # semantic CSS variables per theme and mode
├── styles/              # Tailwind entry, token mapping, base layer, forced-colors
├── stories/             # cross-component compositions and story helpers
├── docs/                # Storybook docs pages (MDX) and the blocks they render
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

## Docs and contributing

Storybook's **Docs** pages (`src/docs/*.mdx`) are the reference:

- **Introduction:** how themes, the token build and Tailwind fit together.
- **Tokens:** every semantic token, read live from `tokens.json`, plus type, shape, density and motion.
- **Themes:** the six themes, what a theme's seeds control, and how to add one.
- **Accessibility:** what is checked automatically, what is checked by hand, and the contrast results for each theme and mode.
- **Contributing:** how to add a component, and the checklist every component must meet.

`pnpm lint` runs `astraq-ui/no-raw-color` (`eslint-rules/no-raw-color.mjs`) on `src/components/**`. It rejects hex colors, color functions such as `rgb()` and `oklch()`, `--p-*` primitives, and Tailwind palette classes such as `bg-red-500`. Stories and tests are exempt, so they can hold fixtures.

## Consuming @astraq/ui

Apps import the built package from `dist/`, not `src/`. Build it first: `pnpm build` and `pnpm dev` run it for you through turbo, `pnpm dev:web` starts the package watcher next to the app, and `pnpm --filter @astraq/ui build` builds it on its own. Storybook and the package's own tests read `src/` and don't need a build.

### JavaScript

```tsx
import { Button, Dialog, ThemeProvider } from "@astraq/ui"; // everything
import { DataTable, useDataTable } from "@astraq/ui/data-table"; // one component
import { ThemeScript, useTheme } from "@astraq/ui/theme";
import { springs } from "@astraq/ui/motion";
import { cn } from "@astraq/ui/cn";
```

Every component folder is its own entry, named after the folder. The output is unbundled ESM, so every file that starts with `"use client"` still does in `dist/`. Display components stay Server Components, and a bundler only pulls in the files an app imports. `react`, `react-dom` and `tailwindcss` are peer dependencies.

### CSS

```css
/* app/global.css */
@import "@astraq/ui/styles.css";

/* The package scans only its own files for classes. Declare your app's. */
@source "./";
@source "../lib";
```

`styles.css` is a Tailwind v4 entry, not compiled CSS. It imports Tailwind and the theme tokens, maps tokens to utilities (`bg-surface`, `text-muted`, `h-control-md`, ...), and adds the base layer and forced-colors rules. The app's Tailwind compiles it together with the app's own classes, so the app gets one set of utilities. Its `@source` lines point at the package's `dist/*.js`, so you only list your own folders.

Apps without Tailwind import `@astraq/ui/tokens.css` instead. It contains only the `--ds-*` variables for every theme, mode and density, and no utilities. The components need the utilities, so this is for apps that style their own markup with the tokens.

### Fonts

The package names font families but doesn't load them. Each theme's `--ds-font-sans`, `--ds-font-display` and `--ds-font-mono` list a family first, then fallbacks: Geist, Sora, Fraunces and JetBrains Mono. Load the ones your themes use under those exact family names, with `@font-face` rules or a font provider's stylesheet. If a family isn't loaded, the browser uses the next one in the list, and nothing breaks.

### Theme, mode and density

Render `ThemeScript` in `<head>`. It runs before first paint and sets `data-theme` and `data-mode` on `<html>` from storage, or from the system color scheme when the mode is `system`. It sets `data-density` only when one is stored; otherwise the theme's default density applies. So the first frame is already themed. Then wrap the app in `ThemeProvider`, which reads and changes the same attributes, and `TooltipProvider`.

```tsx
// app/layout.tsx
import { ThemeScript } from "@astraq/ui/theme";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="forelume" data-mode="dark" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <Providers>{children}</Providers> {/* "use client": ThemeProvider + TooltipProvider */}
      </body>
    </html>
  );
}
```

`suppressHydrationWarning` is needed because the script changes `<html>` attributes before React hydrates.

### Custom themes

Themes are compiled into the package. The token build solves each theme's text, focus and chart colors against WCAG contrast. It also writes the registry that `ThemeProvider`, `ThemeScript` and the `ThemeName` type read. So a custom theme is added in this package, not in the app: follow [To add a theme](#tokens-and-themes) above, then rebuild. Setting `--ds-*` variables on your own `[data-theme]` selector skips the contrast check, and the provider falls back to the default theme for a name it doesn't know.
