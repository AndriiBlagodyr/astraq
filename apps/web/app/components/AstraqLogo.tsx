import { useId } from "react";
import styles from "./AstraqLogo.module.css";

type AstraqLogoProps = {
  className?: string;
};

export function AstraqLogo({ className }: AstraqLogoProps) {
  const id = useId().replace(/:/g, "");
  const rootClassName = [styles.logo, className].filter(Boolean).join(" ");

  const panelGradientId = `${id}-panel-gradient`;
  const beamGradientId = `${id}-beam-gradient`;
  const orbitGradientId = `${id}-orbit-gradient`;
  const glowId = `${id}-glow`;
  const gridId = `${id}-grid`;
  const orbitPathId = `${id}-orbit-path`;

  return (
    <svg
      viewBox="0 0 520 520"
      className={rootClassName}
      role="img"
      aria-labelledby={`${id}-title ${id}-desc`}
    >
      <title id={`${id}-title`}>Astraq animated logo</title>
      <desc id={`${id}-desc`}>
        A luminous Astraq monogram formed from a rising A, orbiting market paths, and pulsing signal
        points.
      </desc>

      <defs>
        <linearGradient id={panelGradientId} x1="74" y1="64" x2="438" y2="462" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--logo-panel-start)" />
          <stop offset="0.52" stopColor="var(--logo-panel-mid)" />
          <stop offset="1" stopColor="var(--logo-panel-end)" />
        </linearGradient>
        <linearGradient id={beamGradientId} x1="140" y1="366" x2="380" y2="172" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#63f5ff" />
          <stop offset="0.5" stopColor="#7aa2ff" />
          <stop offset="1" stopColor="#f5c76b" />
        </linearGradient>
        <linearGradient id={orbitGradientId} x1="112" y1="152" x2="416" y2="392" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#8ef7ff" />
          <stop offset="0.52" stopColor="#5e85ff" />
          <stop offset="1" stopColor="#ffd36a" />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern id={gridId} width="28" height="28" patternUnits="userSpaceOnUse">
          <path d="M 28 0 L 0 0 0 28" fill="none" stroke="rgba(167, 204, 255, 0.08)" strokeWidth="1" />
        </pattern>
        <path
          id={orbitPathId}
          d="M118 296C118 194 190 122 276 122C342 122 401 165 425 228C438 260 436 297 420 327C390 386 330 424 264 424C188 424 125 377 118 296Z"
        />
      </defs>

      <g className={styles.floatLayer}>
        <rect x="42" y="42" width="436" height="436" rx="118" fill={`url(#${panelGradientId})`} />
        <rect x="42" y="42" width="436" height="436" rx="118" fill={`url(#${gridId})`} opacity="0.32" />

        <circle cx="260" cy="260" r="154" className={styles.guideRing} />
        <circle cx="260" cy="260" r="112" className={styles.guideRingInner} />

        <g className={styles.orbitSlow}>
          <path
            d="M98 284C98 164 182 86 286 86C366 86 435 134 464 208"
            className={styles.orbitTrack}
            strokeLinecap="round"
          />
          <path
            d="M423 334C392 401 326 446 252 446C157 446 82 377 76 286"
            className={styles.orbitTrack}
            strokeLinecap="round"
          />
        </g>

        <g className={styles.orbitReverse}>
          <path
            d="M142 196C171 147 220 116 276 108C337 100 398 123 435 168"
            className={styles.secondaryOrbit}
            strokeLinecap="round"
          />
          <path
            d="M129 341C160 388 214 417 272 416C332 416 387 386 420 339"
            className={styles.secondaryOrbit}
            strokeLinecap="round"
          />
        </g>

        <g className={styles.scanLayer}>
          <path
            d="M155 360L260 139L365 360"
            fill="none"
            stroke={`url(#${beamGradientId})`}
            strokeWidth="26"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${glowId})`}
          />
          <path
            d="M197 282H322"
            fill="none"
            stroke={`url(#${beamGradientId})`}
            strokeWidth="18"
            strokeLinecap="round"
            filter={`url(#${glowId})`}
          />
          <path
            d="M118 296C118 194 190 122 276 122C342 122 401 165 425 228C438 260 436 297 420 327C390 386 330 424 264 424C188 424 125 377 118 296Z"
            fill="none"
            stroke={`url(#${orbitGradientId})`}
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="14 18"
            className={styles.signalOrbit}
          />
          <path
            d="M371 356C395 377 410 410 410 446"
            fill="none"
            stroke={`url(#${orbitGradientId})`}
            strokeWidth="12"
            strokeLinecap="round"
            filter={`url(#${glowId})`}
          />
        </g>

        <g className={styles.sparkLayer} filter={`url(#${glowId})`}>
          <circle cx="260" cy="139" r="10" fill="#f5c76b" className={styles.pulseDot} />
          <circle cx="322" cy="282" r="8" fill="#8ef7ff" className={styles.pulseDotDelay} />
          <circle cx="410" cy="446" r="7" fill="#7aa2ff" className={styles.pulseDotSlow} />
          <circle cx="133" cy="207" r="5" fill="#8ef7ff" opacity="0.9" />
          <circle cx="430" cy="211" r="5" fill="#f5c76b" opacity="0.85" />
        </g>

        <g className={styles.runner}>
          <circle r="7" fill="#ffffff" opacity="0.95">
            <animateMotion dur="6.5s" repeatCount="indefinite" rotate="auto">
              <mpath href={`#${orbitPathId}`} />
            </animateMotion>
          </circle>
          <circle r="16" fill="#7cf5ff" opacity="0.18">
            <animateMotion dur="6.5s" repeatCount="indefinite" rotate="auto">
              <mpath href={`#${orbitPathId}`} />
            </animateMotion>
          </circle>
        </g>

        <path
          d="M124 398C169 352 224 338 288 338"
          fill="none"
          stroke="rgba(142, 247, 255, 0.2)"
          strokeWidth="6"
          strokeLinecap="round"
          className={styles.whisper}
        />
      </g>
    </svg>
  );
}
