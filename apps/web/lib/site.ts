import { env } from "./env";

export const siteConfig = {
  name: "Veracand",
  shortName: "Veracand",
  description:
    "Veracand is a personal market research lab: charts, watchlists, honest backtests, and paper trading on one fill model.",
  url: env.NEXT_PUBLIC_APP_URL,
} as const;
