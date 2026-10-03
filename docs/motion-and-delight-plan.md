# Motion & Delight — Rules and Requirements

Goal: Veracand should feel **fast, responsive, and alive**, so people enjoy exploring it and want to come back. Motion should explain what is happening, not decorate.

This extends the design-system plan ([design-system-plan.md](design-system-plan.md), ADR 0002). It sets rules and lists motion requirements. It does not schedule work: each item points to the design-system PR or roadmap phase that builds it. Shared primitives go in `packages/ui`; trading-specific behavior and app shells stay in `apps/web`, as AGENTS.md requires.

---

## Rules (apply to all UI work)

1. **Motion explains state.**
   - Every animation answers one of four questions: where did this come from, where did it go, what changed, or is it working.
   - If an animation answers none of them, remove it.
2. **Use tokens only.**
   - Durations and easings come from `--ds-motion-{fast,base,slow}` and `--ds-ease-{out,in}` (Tailwind: `duration-(--ds-motion-base)`, `ease-out`, `ease-in`), or from the spring presets once they exist.
   - Never use literal `ms` values or ad-hoc cubic-beziers in components.
3. **Respect reduced motion.**
   - The motion tokens already drop to 0ms under `prefers-reduced-motion`, so token-based transitions become instant.
   - Anything that doesn't read the tokens (springs, JS animation, parallax, draw-in) must check reduced motion itself and drop movement.
   - Keep instant feedback: color and opacity changes, and number updates.
   - A spinner may keep rotating, but slower (as `Spinner` does).
4. **Move things only with `transform` and `opacity`.**
   - Movement and scaling use `transform`, `translate`, `scale` and `opacity` (plus `filter` on small elements).
   - Color, border and shadow transitions are fine for state feedback such as hover or focus.
   - Never animate layout properties such as width, height, top, left or margin.
   - Target 60fps with live data streaming.
5. **Follow a motion budget.**
   - At most one prominent animation in view at a time.
   - Ambient motion (sparklines, price ticks) must be subtle and never pulse or loop for attention.
6. **Exits are faster than entries.**
   - Entries take `--ds-motion-base` with ease-out.
   - Exits take `--ds-motion-fast` with ease-in.
   - Dismissals should feel immediate.
7. **Never block input.**
   - Animations can always be interrupted. Prefer CSS transitions on Base UI's `data-starting-style` / `data-ending-style` over keyframes, because a transition reverses smoothly midway.
   - Clicks during a transition go to the new state.
   - Never wait for an animation to finish before responding.
8. **Keyboard parity.**
   - Everything reachable by pointer is reachable by keyboard.
   - Motion that follows hover also follows focus.
9. **Engagement without dark patterns.**
   - Keep people with speed, craft, and insight.
   - No streaks, no urgency pressure, no gamified trading, and no notifications designed to pull people back. For a trading app, compulsive checking leads to overtrading.

---

## Requirements — `packages/ui`

Components already planned in the design-system plan get their motion requirements here; they are not scheduled separately.

| Item | Built in | Motion requirements |
|---|---|---|
| Overlays (Dialog, Select, Tooltip, Tabs) | PR 3 ✅ | Transitions on `data-starting-style` / `data-ending-style`; popovers slide away from their trigger; exits fade faster than entries. |
| Theme switch reveal | PR 4 | A circular reveal from the toggle via `document.startViewTransition` in `ThemeProvider`. Falls back to an instant swap, and is instant under reduced motion. |
| Spring presets | PR 5 | Named presets such as `snappy`, `gentle` and `bouncy-subtle`, exported as plain config objects mapped to the motion tokens. `packages/ui` doesn't depend on an animation library; apps pass the presets to `motion`. |
| `Skeleton` | PR 5, tier B | Shaped like the real content, with a soft shimmer that is static under reduced motion. |
| `Toast` | PR 5, tier B | Slides in and stacks, with undo for destructive actions. Pauses on hover and focus. Announced via a live region (Base UI `Toast`). |
| `Drawer` | PR 5, tier B | A Dialog variant that slides in, with drag-to-dismiss on touch. |
| `AnimatedNumber` | PR 5, tier C | Digits roll to the new value, using tabular numerals so widths stay stable. Generic: no market semantics. Instant under reduced motion. |
| `EmptyState` | PR 5, tier C | Short copy, one clear action, and an optional small illustration. Enters with a fade, never a bounce. |

## Requirements — `apps/web`

These ship with the roadmap phase that builds the screen they belong to. No motion work happens on placeholder routes.

| Item | Phase | Motion requirements |
|---|---|---|
| Route transitions | Phase 1 (first real route) | Crossfade between pages with React/Next 16 view-transition support; the shell stays fixed while content transitions. Read `node_modules/next/dist/docs/` first. |
| Skeleton `loading.tsx` | Phase 1 | Route `loading.tsx` files and suspense boundaries use `Skeleton`. |
| Chart draw-in | Phase 1 | The line or area draws across on first load only, never on live updates. |
| Smooth crosshair | Phase 1 | The tooltip follows without jitter and is clamped to the chart bounds. Linked across synced charts from Phase 6. |
| Prefetching | Phase 1 | Prefetch on hover or focus, and on viewport entry for primary links. |
| Shared-element morphs | Phase 2 | A watchlist row morphs into the symbol detail header, using `view-transition-name`. |
| Sparklines | Phase 2 | In watchlists. Static SVG; only the latest point animates on update. |
| Command palette (⌘K / Ctrl+K) | Phase 2 (with symbol search) | Built in `apps/web` from `packages/ui` Dialog + Combobox. Jump to any symbol, page, or action, with fuzzy search and recent items. |
| Keyboard shortcuts | Phase 2 | `g` then `s` goes to Stocks, `/` focuses search, `?` opens a shortcut overlay. Every shortcut is listed in the palette too. |
| Optimistic updates | Phase 2 (watchlists), Phase 3 (paper orders) | Update instantly, reconcile with the server, and roll back with a toast on failure. |
| Drag to reorder | Phase 2 (watchlists), Phase 6 (dashboard panels) | Keyboard reordering too: Space to lift, arrows to move. |
| Backtest as a story | Phase 5 | The equity curve draws progressively while the job runs (streamed progress), not a spinner followed by a result. |
| Linked views | Phase 6 | Hovering a trade highlights it on the chart. A timeframe change on one chart syncs the others. |
| Forecast bands | Phase 8 | Bands fade and grow out of the last candle. |
| Price tick flash | Phase 9 | Briefly tint the cell with the `positive` / `negative` tokens on change, then fade out. Built on `AnimatedNumber`. |

## Done when (per item)

- The rules above hold, checked by hand in Storybook and the app, with the OS reduced-motion setting both on and off.
- No animation runs below 60fps in Chrome DevTools' performance panel on a mid-range laptop with live data on screen.
- The interaction works with the keyboard alone.
