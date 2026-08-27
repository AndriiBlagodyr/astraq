# ADR 0001: Tailwind and headless primitives over Mantine

- Status: Accepted
- Date: 2026-08-27

## Context

Astraq needs a distinct, accessible design language that supports independent brand themes and light/dark modes. The existing web app used Mantine primarily for its provider and color-scheme runtime while most product visuals were already app-owned CSS Modules.

Keeping Mantine would reduce short-term migration work, but reusable components would remain coupled to Mantine's theme and component APIs. Building every interactive primitive from scratch would provide full control at the cost of accessibility risk and maintenance.

## Decision

- Use Tailwind CSS for component styling and responsive composition.
- Use semantic CSS custom properties as the public token contract.
- Keep brand identity (`data-theme`) independent from color mode (`data-mode`).
- Use accessible headless primitives selectively for behavior-heavy controls.
- Keep reusable tokens and core components in `packages/ui`.
- Keep trading patterns, page layouts, and product behavior in `apps/web`.
- Use Storybook as the initial component catalog; do not add a separate docs app yet.
- Do not add generic layout wrappers until repeated product usage demonstrates a stable abstraction.

## Consequences

- Astraq owns its visual language and can add themes without changing component code.
- Accessible overlays and composite controls reuse maintained interaction behavior.
- Product pages can migrate incrementally through the semantic token compatibility layer.
- Contributors must avoid raw palette values in shared components and must document meaningful states in Storybook.
- `packages/ui` remains a presentation package and cannot import from `apps/web`.
