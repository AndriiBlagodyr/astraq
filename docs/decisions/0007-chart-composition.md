# ADR 0007: Chart composition: lightweight-charts for time-axis charts, D3 for the rest, and how D3 lives in React

- Status: Accepted
- Date: 2026-11-09

## Context

Veracand's third goal is creative chart visualization. Phase 1 shipped the candle and volume chart on `lightweight-charts`; Phase 2 adds the first view that isn't a price over time, the returns distribution (ROADMAP item 7), and Phase 6 adds several more (drawdowns, seasonality heatmap, relative performance). Two questions need one answer before the second chart library enters the web app:

1. Which library draws what, so the app doesn't end up with three ways to draw an axis.
2. How D3, a library built to own the DOM, coexists with React, a library built to own the DOM.

Constraints: the design system's semantic tokens (`--ds-chart-*`, `--ds-positive`, `--ds-chart-grid`) must drive every color, including after a theme switch; every chart needs an accessible name and its numbers available as text; pages render on the server first (RSC), so as little as possible should depend on the browser.

### Options considered

| Option | Verdict |
|---|---|
| **`lightweight-charts` for anything with a time axis; D3 modules (`d3-scale`, `d3-array`, `d3-shape`) for everything else, computing geometry only; React renders the SVG** | **Chosen.** Each library does what it's best at, and the React tree stays the single owner of the DOM. |
| `lightweight-charts` for everything | It's a price-chart engine: canvas, time series, panes. It has no histogram, heatmap, or arbitrary x axis, and bending it to those would fight the library. |
| D3 for everything, including the candle chart | D3 can draw candles, but then we own panning, zooming, crosshairs, pane sync, and canvas performance on ten years of bars, all of which `lightweight-charts` already does well (Phase 6 measures this). |
| A React charting library (Recharts, visx, Nivo) for the non-time charts | Faster to a first chart, but it hides the scales and generators the roadmap wants learned, and each brings its own theming and accessibility story to reconcile with the design system. |
| D3 owning the DOM through a ref (`d3.select(ref).append(...)`) | The classic pattern, but two owners of one subtree: React reconciles around nodes it didn't create, hydration can't match them, server rendering is impossible, and tokens have to be read with `getComputedStyle` instead of plain `var(--ds-chart-2)`. |

## Decision

### 1. The split

- **Time on the x axis → `lightweight-charts`.** Candles, volume, equity curves, drawdown over time, indicator panes, markers. One canvas engine, one crosshair, one way to sync panes.
- **Anything else → D3 modules + React.** Distributions, heatmaps, scatter and comparison views, small multiples. Also any static SVG that is a picture of data, like the watchlist sparkline (`lib/sparkline.ts` already follows this pattern without D3).

### 2. How D3 lives in React

D3 is imported as the modules that compute, never as the `d3` bundle that selects:

- **`d3-array`** bins and summarizes (`bin`, `max`, `extent`).
- **`d3-scale`** maps data to pixels and proposes ticks (`scaleLinear().nice().ticks()`).
- **`d3-shape`** turns points into path strings (`line`, `area`, `arc`).

A pure function in `apps/web/lib` (for the first view, `histogramLayout` in `lib/returns-view.ts`) takes the data and a size and returns a plain layout object: bars with `x, y, width, height`, tick positions, path strings. It has no DOM, no `window`, and no side effects, so it runs on the server, in a unit test, and in the browser alike. A React component maps that layout to `<rect>`, `<path>`, `<text>` elements. Interaction is React state (`useState` for the hovered bar) that changes props, not D3 event handlers mutating attributes.

`d3-selection`, `d3-transition`, `d3-axis`, and `d3-zoom` are not used: each of them writes to the DOM. If a view ever needs zoom or brushing, it gets a React implementation of the pointer handling over D3 scales, or it moves to `lightweight-charts` if it turned out to be a time series after all.

### 3. Theme and accessibility rules for every chart

- Colors are CSS variables in attributes, `fill="var(--ds-chart-2)"`, so a theme or mode switch repaints without JavaScript. `lightweight-charts` can't read CSS, so `lib/chart-theme.ts` resolves the same tokens for it once per paint; that is the only place tokens are read with `getComputedStyle`.
- Series colors come from `--ds-chart-1` to `--ds-chart-8`; grids and axes from `--ds-chart-grid` and `--ds-chart-axis`; gains and losses from `--ds-positive` and `--ds-negative`. No literal colors in `apps/web`.
- The SVG has `role="img"` and an accessible name that says what is shown over which range; the numbers it depicts are also on the page as text (a table, a caption, or the row's other cells), so the picture is never the only copy. Hover and focus report the same detail, so keyboard users see what mouse users see.
- Motion follows the motion plan: a first-load draw-in at most, nothing under `prefers-reduced-motion`.

## Consequences

- Two chart libraries, with a clear line between them. A new view starts by asking "is time the x axis?".
- `apps/web/lib` gains pure layout modules that are easy to unit-test; the components stay thin. Server components can render static SVG charts with no client JavaScript; only interaction needs `"use client"`.
- Hand-rolling axes and ticks costs a little more per chart than `d3-axis` would, in exchange for one DOM owner, server rendering, and plain token references. The returns histogram's axis is about twenty lines.
- The `d3` umbrella package stays installed from Phase 1 planning but nothing imports it; the three modules are direct dependencies with their types. It can be removed when a lockfile change is convenient.
- Phase 6 revisits this ADR with measurements: the symbol page's interaction budget (under 100 ms on ten years of daily bars) is the test of the `lightweight-charts` side, and the seasonality heatmap and comparison view are the test of the D3 side. If either fails, this ADR is amended with the numbers.
