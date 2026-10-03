import type { StorybookConfig } from "@storybook/react-vite";
import tailwindcss from "@tailwindcss/vite";

const config: StorybookConfig = {
  stories: ["../src/docs/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: [
    // MDX pages in src/docs: Introduction, Tokens, Themes, Accessibility, Contributing.
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
    // Toggle :hover/:focus-visible/:active in the toolbar to review states.
    "storybook-addon-pseudo-states",
  ],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  // Dev-only. Lets the Storybook server accept the public ngrok Host header.
  core: {
    allowedHosts: [
      ".ngrok-free.app",
      ".ngrok-free.dev",
      ".ngrok.app",
      ".ngrok.io",
    ],
  },
  async viteFinal(viteConfig) {
    viteConfig.plugins ??= [];
    viteConfig.plugins.push(tailwindcss());
    viteConfig.server ??= {};
    viteConfig.server.allowedHosts = [
      ".ngrok-free.app",
      ".ngrok-free.dev",
      ".ngrok.app",
      ".ngrok.io",
    ];
    return viteConfig;
  },
};

export default config;
