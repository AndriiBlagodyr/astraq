import type { Decorator, Preview } from "@storybook/react-vite";
import {
  DEFAULT_COLOR_MODE,
  DEFAULT_THEME,
  THEMES,
  ThemeProvider,
  TooltipProvider,
  isThemeName,
} from "../src";
import "../src/styles/index.css";

const withTheme: Decorator = (Story, context) => {
  const mode = context.globals.mode === "light" ? "light" : "dark";
  const theme = isThemeName(context.globals.theme)
    ? context.globals.theme
    : DEFAULT_THEME;

  document.documentElement.dataset.mode = mode;
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = mode;

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
        dynamicTitle: true,
      },
    },
    theme: {
      description: "Brand theme",
      toolbar: {
        icon: "paintbrush",
        items: THEMES.map((theme) => ({
          value: theme.name,
          title: theme.label,
        })),
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    mode: DEFAULT_COLOR_MODE,
    theme: DEFAULT_THEME,
  },
  parameters: {
    controls: { expanded: true },
    a11y: {
      test: "error",
    },
  },
};

export default preview;
