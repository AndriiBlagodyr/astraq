import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";
import { defaultFeaturedSymbol } from "@/lib/stocks";

const routes = [
  "/",
  "/market-data",
  "/stocks",
  `/stocks/${defaultFeaturedSymbol}`,
  `/stocks/${defaultFeaturedSymbol}/tradingview`,
  `/stocks/${defaultFeaturedSymbol}/custom`,
  `/stocks/${defaultFeaturedSymbol}/compare`,
  "/predictions",
  `/predictions/${defaultFeaturedSymbol}`,
  `/predictions/${defaultFeaturedSymbol}/algorithms`,
  `/predictions/${defaultFeaturedSymbol}/backtests`,
  "/experiments",
];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: new URL(route, siteConfig.url).toString(),
    lastModified: new Date(),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.7,
  }));
}
