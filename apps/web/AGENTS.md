<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# apps/web — Veracand Frontend

- Next.js 16 App Router, React 19. RSC by default; add `"use client"` only where needed.
- UI: Tailwind CSS + semantic CSS-variable tokens from `@astraq/ui`. No CSS-in-JS runtimes.
- Reusable accessible components belong in `packages/ui`; trading patterns, page composition, and app shells stay in `apps/web`.
- Keep `data-theme` (brand identity) independent from `data-mode` (light/dark). Components never hard-code theme palette values.
- Use headless primitives only for behavior-heavy controls; prefer native HTML for simple controls.
- Data: server components fetch directly via the SDK; writes are server actions answering with `ActionResult` (`lib/action-result.ts`). There is no client-side cache yet: `@tanstack/react-query` joins when something needs one (ROADMAP Phase 9).
- Charts: `lightweight-charts` for OHLCV panes; `d3` for bespoke viz (heatmaps, treemaps, distributions).
- Forms: `react-hook-form` + `zod` via `@hookform/resolvers`.
- Testing: Vitest + Testing Library; Playwright for E2E.
