/**
 * The Forelume app icon: the mark on a night tile, as plain SVG markup.
 * Copy the string to reuse it anywhere (HTML, Figma "Paste as SVG", docs).
 *
 * `app/icon.ts` serves it as the favicon and PWA icon. Colors are fixed to the
 * Forelume dark palette because browsers render favicons outside the page's
 * theme. The themed, animated mark is `components/AstraqLogo.tsx`; keep the
 * geometry of both in sync.
 */
export const BRAND_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 48 48" fill="none">
  <defs>
    <linearGradient id="fl-tile" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#13244a"/>
      <stop offset="1" stop-color="#060c1c"/>
    </linearGradient>
    <linearGradient id="fl-ring" x1="6" y1="42" x2="30" y2="6" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#7196FF"/>
      <stop offset="1" stop-color="#4CEEFF"/>
    </linearGradient>
    <linearGradient id="fl-cone" x1="24" y1="22" x2="46" y2="17" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#4CEEFF" stop-opacity="0.7"/>
      <stop offset="0.6" stop-color="#F4C96D" stop-opacity="0.38"/>
      <stop offset="1" stop-color="#F4C96D" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="fl-halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#4CEEFF" stop-opacity="0.6"/>
      <stop offset="1" stop-color="#4CEEFF" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="fl-clip">
      <rect width="48" height="48" rx="11"/>
    </clipPath>
  </defs>
  <g clip-path="url(#fl-clip)">
    <rect width="48" height="48" fill="url(#fl-tile)"/>
    <g transform="translate(24 24) scale(0.86) translate(-25 -25)">
      <path d="M 34.93 15.25 A 17 17 0 1 0 34.93 34.75" stroke="url(#fl-ring)" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M 24 22 L 45 9 L 45 25 Z" fill="url(#fl-cone)"/>
      <path d="M 24 22 L 40.5 13.8" stroke="#4CEEFF" stroke-width="1.4" stroke-linecap="round" stroke-dasharray="1.4 2.6"/>
      <path d="M 9 32 L 14 26 L 18 29.5 L 24 22" stroke="#4CEEFF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="24" cy="22" r="6" fill="url(#fl-halo)"/>
      <circle cx="24" cy="22" r="2.9" fill="#EDF4FF"/>
      <circle cx="24" cy="22" r="1.3" fill="#4CEEFF"/>
      <path d="M 41 8.6 Q 41.7 12.8 45.4 13.5 Q 41.7 14.2 41 18.4 Q 40.3 14.2 36.6 13.5 Q 40.3 12.8 41 8.6 Z" fill="#F4C96D"/>
    </g>
  </g>
</svg>
`;
