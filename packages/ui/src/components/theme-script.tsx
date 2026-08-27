const themeScript = `
(() => {
  try {
    const root = document.documentElement;
    const savedMode = localStorage.getItem("astraq-color-mode");
    const savedTheme = localStorage.getItem("astraq-theme");
    const mode = savedMode === "light" || savedMode === "dark"
      ? savedMode
      : (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    const theme = savedTheme === "terminal" || savedTheme === "midnight"
      ? savedTheme
      : "astraq";
    root.dataset.mode = mode;
    root.dataset.theme = theme;
    root.style.colorScheme = mode;
  } catch {
    document.documentElement.dataset.mode = "dark";
    document.documentElement.dataset.theme = "astraq";
  }
})();
`;

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
