import eslint from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
import astraqUi from "./eslint-rules/no-raw-color.mjs";

export default tseslint.config(
  { ignores: ["storybook-static/**", "dist/**"] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    // Shipped component code reads semantic tokens only. Stories and tests
    // may hold fixtures, such as an inline SVG avatar.
    files: ["src/components/**/*.{ts,tsx}"],
    ignores: ["**/*.stories.tsx", "**/*.test.{ts,tsx}"],
    plugins: { "astraq-ui": astraqUi },
    rules: { "astraq-ui/no-raw-color": "error" },
  },
);
