/**
 * The Veracand app icon: the mark on a night tile, as plain SVG markup.
 * Copy the string to reuse it anywhere (HTML, Figma "Paste as SVG", docs).
 *
 * `app/icon.ts` serves it as the favicon and PWA icon. Colors are fixed to the
 * veracand theme's dark palette because browsers render favicons outside the page's
 * theme. The themed, animated mark is `components/VeracandLogo.tsx`; keep the
 * geometry of both in sync.
 */
export const BRAND_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 48 48" fill="none">
  <defs>
    <linearGradient id="vc-tile" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#13244a"/>
      <stop offset="1" stop-color="#060c1c"/>
    </linearGradient>
    <clipPath id="vc-clip">
      <rect width="48" height="48" rx="11"/>
    </clipPath>
  </defs>
  <g clip-path="url(#vc-clip)">
    <rect width="48" height="48" fill="url(#vc-tile)"/>
    <g transform="translate(24 24) scale(0.86) translate(-24.1 -24.1)">
      <path d="M 5.5 13.5 L 18 40 L 29 27.5" stroke="#7196FF" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 32 8.5 V 29.5" stroke="#4CEEFF" stroke-width="2.2" stroke-linecap="round"/>
      <rect x="28.3" y="12.5" width="7.4" height="13.5" rx="1.6" fill="#4CEEFF"/>
      <path d="M 41 6.2 Q 41.65 9.35 44.8 10 Q 41.65 10.65 41 13.8 Q 40.35 10.65 37.2 10 Q 40.35 9.35 41 6.2 Z" fill="#F4C96D"/>
    </g>
  </g>
</svg>
`;
