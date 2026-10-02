import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

// Only public pages with content of their own. App pages join as they ship
// (docs/ui-plan.md); /status is operational, not content.
const routes = ["/"];

export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route) => ({
    url: new URL(route, siteConfig.url).toString(),
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 1,
  }));
}
