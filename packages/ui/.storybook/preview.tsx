import type { Decorator, Preview } from "@storybook/react-vite";
import { ThemeProvider, TooltipProvider } from "../src";
import "../src/styles/index.css";

const withTheme: Decorator = (Story, context) => {
  const mode = context.globals.mode === "light" ? "light" : "dark";
  const theme =
    context.globals.theme === "terminal" || context.globals.theme === "midnight"
      ? context.globals.theme
      : "astraq";

  document.documentElement.dataset.mode = mode;
  document.documentElement.dataset.theme = theme;

  return (
    <ThemeProvider>
      <TooltipProvider>
        <div className="min-h-screen bg-background p-8 text-foreground">
          <Story />
        </div>
      </TooltipProvider>
    </ThemeProvider>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    mode: {
      description: "Color mode",
      toolbar: {
        icon: "mirror",
        items: ["dark", "light"],
      },
    },
    theme: {
      description: "Brand theme",
      toolbar: {
        icon: "paintbrush",
        items: ["astraq", "terminal", "midnight"],
      },
    },
  },
  initialGlobals: {
    mode: "dark",
    theme: "astraq",
  },
  parameters: {
    controls: { expanded: true },
    a11y: {
      test: "error",
    },
  },
};

export default preview;
