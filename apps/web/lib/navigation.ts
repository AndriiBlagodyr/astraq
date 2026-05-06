export const marketingNavigation = [
  { href: "/", label: "Home" },
  { href: "/market-data", label: "Market Data" },
  { href: "/stocks", label: "Stocks" },
  { href: "/predictions", label: "Predictions" },
  { href: "/experiments", label: "Experiments" },
] as const;

export const marketingAuthActions = [
  { href: "/login", label: "Sign in" },
  { href: "/register", label: "Create account" },
] as const;

export const appNavigationSections = [
  {
    label: "Markets",
    items: [
      { href: "/market-data", label: "Market Data" },
      { href: "/stocks", label: "Stocks" },
      { href: "/watchlists", label: "Watchlists" },
    ],
  },
  {
    label: "Trading",
    items: [
      { href: "/portfolio", label: "Portfolio" },
      { href: "/strategies", label: "Strategies" },
      { href: "/backtests", label: "Backtests" },
    ],
  },
  {
    label: "Research",
    items: [
      { href: "/predictions", label: "Predictions" },
      { href: "/experiments", label: "Experiments" },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/account", label: "Account" },
      { href: "/status", label: "Roadmap status" },
    ],
  },
] as const;
