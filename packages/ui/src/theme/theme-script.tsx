import {
  COLOR_MODE_STORAGE_KEY,
  DEFAULT_COLOR_MODE,
  DEFAULT_THEME,
  THEME_NAMES,
  THEME_STORAGE_KEY,
} from "./registry";

// Runs in <head> before first paint so the stored theme applies without a
// flash. Values are inlined from the registry; keep this dependency-free ES5.
const themeScript = `
(function () {
  var root = document.documentElement;
  var themes = ${JSON.stringify(THEME_NAMES)};
  try {
    var savedMode = localStorage.getItem(${JSON.stringify(COLOR_MODE_STORAGE_KEY)});
    var savedTheme = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var mode = savedMode === "light" || savedMode === "dark"
      ? savedMode
      : (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    var theme = themes.indexOf(savedTheme) >= 0 ? savedTheme : ${JSON.stringify(DEFAULT_THEME)};
    root.dataset.mode = mode;
    root.dataset.theme = theme;
    root.style.colorScheme = mode;
  } catch (error) {
    root.dataset.mode = ${JSON.stringify(DEFAULT_COLOR_MODE)};
    root.dataset.theme = ${JSON.stringify(DEFAULT_THEME)};
  }
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
