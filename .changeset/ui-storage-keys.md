---
"@astraq/ui": patch
---

Theme preferences are stored under `astraq-color-mode`, `astraq-theme` and `astraq-density` instead of the `forelume-*` keys, and the provider's change event is `astraq-theme-change`. Forelume is one theme now, not the product name. Saved choices under the old keys are not read, so they reset once to the defaults.
