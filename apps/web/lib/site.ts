export const siteConfig = {
  name: "Astraq",
  shortName: "Astraq",
  description:
    "Dark-mode trading analytics, prediction workflows, and portfolio operations built on a production-ready Next.js app shell.",
  tagline: "Signal-rich trading intelligence for research, execution, and model-driven forecasting.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
} as const;
