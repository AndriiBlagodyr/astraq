# ADR 0002: Base UI primitives, layered tokens, and an extractable `@astraq/ui`

- Status: Accepted
- Date: 2026-09-25
- Extends: ADR 0001

## Context

ADR 0001 established `packages/ui` with Tailwind, semantic CSS variables, and headless primitives (Radix). The package now needs to grow from ~15 components and 3 themes into a professional design system that:

- ships 6+ themes that differ in identity (color, typography, radius, density, surface treatment), not just accent hue, each in light and dark;
- stays reusable outside Astraq without a rewrite;
- is accessible by construction and verified by tests, not by eye.

The current package has limits that block this:

1. **Themes only swap brand colors.** Neutrals, surfaces, and shadows live in a shared `data-mode` block, so every theme looks the same apart from its accent.
2. **Theme names are hardcoded** in `theme.tsx`, `theme-script.tsx`, and Storybook's `preview.tsx`.
3. **The package is tied to the monorepo.** `styles/index.css` has `@source` pointing at `apps/web`, and `exports` points at raw `src/*.ts`.
4. **Surfaces use raw rgba hex values**, so contrast can't be checked automatically.
5. **Radix primitives.** They work, but maintenance has slowed. Base UI (`@base-ui/react`, v1 stable, built by former Radix, Floating UI and MUI authors) covers more ground: Combobox, Autocomplete, Number Field, Meter, Toolbar, Toast. shadcn/ui now supports Base UI as a primitive layer too.

### Options considered

| Option | Verdict |
|---|---|
| Stay on Radix | Viable, avoids migration, but weaker long-term trajectory and no combobox/number field. |
| **Base UI** | **Chosen.** Active, broad primitive set, `render`-prop composition, shadcn-compatible. Migration cost is small today (4 wrappers). |
| React Aria Components | Best a11y/i18n, but a verbose API for everyday controls. Kept as a targeted exception (see below). |
| Ark UI | Framework-agnostic, but a smaller ecosystem; Astraq is React-only. |
| Styled kits (Radix Themes, Mantine, HeroUI, Chakra) | Rejected: they impose a visual language, which is what ADR 0001 moved away from. |

## Decision

### 1. Primitive layer

- **Base UI** is the default headless layer for all behavior-heavy controls.
- **shadcn/ui is a reference, not a dependency.** We borrow its conventions (CVA variants, `cn()`, `data-slot` attributes, composition) and restyle everything onto our tokens.
- **React Aria Components** are allowed only for date/time fields, calendars, and range pickers. They must be wrapped so no React Aria type appears in the public API.
- **TanStack Table / TanStack Virtual** back data-grid recipes. No headless kit handles those well.
- All Radix dependencies are removed.

### 2. Token architecture (three tiers)

| Tier | Example | Who references it |
|---|---|---|
| Primitive | `--p-cyan-9`, 12-step OKLCH scales per hue, separate light and dark scales | Theme definitions only |
| Semantic | `--ds-bg-surface`, `--ds-fg-muted`, `--ds-accent`, `--ds-positive-subtle`, `--ds-radius-control`, `--ds-density` | Components and apps |
| Component | `--ds-button-height-md` | That component only, and only when a semantic token isn't enough |

- **Components never reference primitives or literal colors.** Lint and tests enforce this.
- **Each theme defines the full semantic set for both modes**: neutrals, surfaces, shadows, fonts, radii, and density. A theme is a complete identity.
- **Themes are authored as typed TypeScript data** (`tokens/themes/*.ts`). A hand-built script generates:
  - the CSS files,
  - a W3C DTCG `tokens.json` for other tools and Figma,
  - a `THEMES` registry.

  The registry is the single source for ThemeProvider, ThemeScript, Storybook, and tests.
- The `--ds-` prefix stays.

### 3. Theme axes

Each axis is an independent `data-*` attribute on `<html>`:

- `data-theme`: identity (`forelume`, `terminal`, `midnight`, `paper`, `graphite`, `contrast`).
- `data-mode`: `light` | `dark`. The user preference can also be `system`, which resolves at runtime and follows `prefers-color-scheme`.
- `data-density`: `comfortable` | `compact`. Optional, and a theme may set its own default.

**Theme and mode stay separate switches, and each theme is a complete palette.** Picking a theme swaps its whole color set: brand, status, backgrounds, surfaces, borders, text and shadows. The mode chooses that theme's light or dark version. This replaces today's setup, where themes only change accent colors and light/dark defines everything else.

We considered making the theme the only switch, with light or dark built into each theme (like VS Code themes). It's simpler to design, but it breaks "follow the OS light/dark setting", which matters for an app people use for hours and often late at night. So we rejected it.

**Market semantics stay in `apps/web`.** That includes up/down colors, red-up conventions, and colorblind-safe palettes. The app maps `--market-up` / `--market-down` onto the package's status tokens. `packages/ui` knows "positive/negative", never "bid/ask".

### 4. Accessibility is tested, not reviewed

- A contrast test covers every theme × mode × text/background (and UI/background) pair. It flattens translucent surfaces over the page background before measuring. The bar is WCAG 2.2 AA: 4.5:1 for text, 3:1 for large text, UI boundaries, and focus indicators. The `contrast` theme must meet AAA for text.
- Storybook a11y stays at `test: "error"`.
- `forced-colors` and `prefers-reduced-motion` are supported in base styles.

### 5. Extractability

- `packages/ui` builds to `dist/` with **tsdown**: ESM, `.d.ts`, preserved `"use client"` directives, and compiled CSS.
- `exports` points at `dist`. Consumers declare their own Tailwind `@source`, so the package stops scanning `apps/web`.
- **Changesets** manage versions and the changelog.
- The package stays private until a second consumer exists. At that point the npm scope is decided and it's published (npm or GitHub Packages), or served as a shadcn-style registry.

### 6. Hand-built layers (learning > shipping)

- **Token pipeline:** OKLCH scale generation, CSS/DTCG emit, and the contrast checker. *Production alternative: Style Dictionary or Terrazzo.*
- **SegmentedControl:** WAI-ARIA radio-group keyboard pattern, roving tabindex. *Production alternative: Base UI Toggle Group / Radio Group.*

## Consequences

- Themes can change the whole look (flat terminal vs. glass vs. editorial paper) without touching component code.
- Adding a theme becomes one TS file plus a green contrast test.
- Migrating Radix to Base UI changes state selectors (`data-[state=open]` → Base UI's boolean attributes such as `data-open`) and `asChild` → `render`. `apps/web` has no direct Radix usage, so the blast radius is the package.
- Consumers must load fonts themselves (e.g. `next/font`); the package only declares font stacks.
- A build step now sits between package source and the app. Turbo already orders `^build`.
- The transitional aliases in `styles/index.css` are deleted once the `layout.module.css` migration (the Phase 0 follow-up) is finished.
