// @vitest-environment node
import { RuleTester } from "eslint";
import { noRawColor } from "./no-raw-color.mjs";

/**
 * A broken pattern doesn't fail lint, it just lets every color through. These
 * cases keep each check matching what it should, and only that.
 */
const tester = new RuleTester({
  languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
});

tester.run("no-raw-color", noRawColor, {
  valid: [
    `cn("bg-surface text-negative-fg border-border-control")`,
    `const shadow = "color-mix(in oklch, var(--ds-brand) 20%, transparent)"`,
    `<a href="#top">Back</a>`,
    `const id = "#add-row"`,
    `const entity = "&#123;"`,
    `const label = "neutral-500 shares"`,
    `<p>Rose 500 basis points</p>`,
    // Comments may name colors: #fff, rgb(0 0 0), bg-red-500.
    `const x = 1`,
  ],
  invalid: [
    { code: `const c = "#0a172a"`, errors: [{ messageId: "hex" }] },
    { code: `cn("bg-[#fff]")`, errors: [{ messageId: "hex" }] },
    { code: `const c = "rgb(0 0 0 / 50%)"`, errors: [{ messageId: "colorFunction" }] },
    { code: "const c = `oklch(${l} 0.1 200)`", errors: [{ messageId: "colorFunction" }] },
    { code: `const v = "var(--p-neutral-3)"`, errors: [{ messageId: "primitive" }] },
    { code: `cn("hover:bg-red-500")`, errors: [{ messageId: "palette" }] },
    { code: `cn("text-white")`, errors: [{ messageId: "palette" }] },
    { code: `<span>#fff</span>`, errors: [{ messageId: "hex" }] },
  ],
});
