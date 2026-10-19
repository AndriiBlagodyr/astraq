import type { MetadataRoute } from "next";

// Every page is private (ROADMAP § Data licensing): provider data never sits
// on a public, indexable page. proxy.ts leaves this file outside the password
// gate, so crawlers can read it. A sitemap returns with the first public page.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
