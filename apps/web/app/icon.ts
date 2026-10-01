import { BRAND_ICON_SVG } from "@/lib/brand-icon";

// App icon route: Next adds <link rel="icon" type="image/svg+xml"> to <head>
// and serves this at /icon. The markup lives in lib/brand-icon.ts.
export const contentType = "image/svg+xml";

export default function Icon() {
  return new Response(BRAND_ICON_SVG, {
    headers: { "Content-Type": contentType },
  });
}
