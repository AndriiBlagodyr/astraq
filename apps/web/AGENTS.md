<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# apps/web — Astraq Frontend

- Next.js 16 App Router, React 19. RSC by default; add `"use client"` only where needed.
- UI: Mantine v9 + CSS Modules. No Tailwind. No CSS-in-JS runtimes.
- Data: `@tanstack/react-query` v5 for client; server components fetch directly via the SDK.
- Charts: `lightweight-charts` for OHLCV panes; `d3` for bespoke viz (heatmaps, treemaps, distributions).
- Forms: `react-hook-form` + `zod` via `@hookform/resolvers`.
- Testing: Vitest + Testing Library; Playwright for E2E.
