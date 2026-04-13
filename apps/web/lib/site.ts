export const siteConfig = {
  name: "Astraq",
  shortName: "Astraq",
  description:
    "Astraq is a full-stack and machine learning learning lab for market data, stock visualizations, and per-symbol prediction experiments.",
  tagline: "Build the stack, learn the stack, and test market ideas with custom charts and prediction workflows.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;
