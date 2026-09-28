import type { Decorator, Preview } from "@storybook/react-vite";
import {
  DEFAULT_COLOR_MODE,
  DEFAULT_THEME,
  THEMES,
  ThemeProvider,
  TooltipProvider,
  isDensity,
  isThemeName,
} from "../src";
import "../src/styles/index.css";

const withTheme: Decorator = (Story, context) => {
  const mode = context.globals.mode === "light" ? "light" : "dark";
  const theme = isThemeName(context.globals.theme)
    ? context.globals.theme
    : DEFAULT_THEME;

  const root = document.documentElement;
  root.dataset.mode = mode;
  root.dataset.theme = theme;
  root.style.colorScheme = mode;
  // "theme" (or anything unknown) leaves the attribute off: the theme's default applies.
  if (isDensity(context.globals.density)) root.dataset.density = context.globals.density;
  else delete root.dataset.density;

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
    density: {
      description: "Density",
      toolbar: {
        icon: "component",
        items: [
          { value: "theme", title: "Theme default" },
          { value: "comfortable", title: "Comfortable" },
          { value: "compact", title: "Compact" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: {
    mode: DEFAULT_COLOR_MODE,
    theme: DEFAULT_THEME,
    density: "theme",
  },
  parameters: {
    controls: { expanded: true },
    a11y: {
      test: "error",
    },
  },
};

export default preview;
