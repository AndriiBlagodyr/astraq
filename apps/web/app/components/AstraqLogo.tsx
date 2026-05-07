import { useId } from "react";
import styles from "./AstraqLogo.module.css";

type AstraqLogoProps = {
  className?: string;
  /**
   * When true, marks the SVG as decorative (aria-hidden) and skips the
   * embedded title. Use when a sibling element already labels the brand.
   */
  decorative?: boolean;
};

/**
 * Astraq mark — a constellation "A" with three vertex stars, a glowing apex,
 * and rising candles inside the frame. Themed via CSS variables so it adapts
 * cleanly to both dark and light schemes.
 */
export function AstraqLogo({ className, decorative = false }: AstraqLogoProps) {
  const reactId = useId().replace(/:/g, "");
  const titleId = `${reactId}-title`;
  const strokeId = `${reactId}-stroke`;
  const candleId = `${reactId}-candle`;
  const haloId = `${reactId}-halo`;
  const glowId = `${reactId}-glow`;

  const rootClassName = [styles.logo, className].filter(Boolean).join(" ");
  const a11yProps = decorative
    ? { "aria-hidden": true as const, focusable: false as const }
    : { role: "img" as const, "aria-labelledby": titleId };

  return (
    <svg viewBox="0 0 48 48" className={rootClassName} {...a11yProps}>
      {!decorative ? <title id={titleId}>Astraq</title> : null}

      <defs>
        <linearGradient
          id={strokeId}
          x1="6"
          y1="44"
          x2="42"
          y2="6"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="var(--logo-stop-1)" />
          <stop offset="0.55" stopColor="var(--logo-stop-2)" />
          <stop offset="1" stopColor="var(--logo-stop-3)" />
        </linearGradient>

        <linearGradient id={candleId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--logo-stop-3)" />
          <stop offset="1" stopColor="var(--logo-stop-1)" />
        </linearGradient>

        <radialGradient id={haloId} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--logo-halo)" stopOpacity="0.7" />
          <stop offset="1" stopColor="var(--logo-halo)" stopOpacity="0" />
        </radialGradient>

        <filter id={glowId} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>

      <circle
        cx="24"
        cy="9"
        r="11"
        fill={`url(#${haloId})`}
        className={styles.halo}
      />

      <path
        d="M 6 41 Q 24 53 42 41"
        fill="none"
        stroke="var(--logo-orbit)"
        strokeWidth="1"
        strokeDasharray="1.6 3"
        strokeLinecap="round"
        className={styles.orbit}
      />

      <g className={styles.candles}>
        <rect
          x="18.5"
          y="33"
          width="1.8"
          height="6"
          rx="0.6"
          fill={`url(#${candleId})`}
          className={styles.candleA}
        />
        <rect
          x="23.1"
          y="30"
          width="1.8"
          height="9"
          rx="0.6"
          fill={`url(#${candleId})`}
          className={styles.candleB}
        />
        <rect
          x="27.7"
          y="26"
          width="1.8"
          height="13"
          rx="0.6"
          fill={`url(#${candleId})`}
          className={styles.candleC}
        />
      </g>

      <g className={styles.frame} filter={`url(#${glowId})`}>
        <path
          d="M 8 41 L 24 7 L 40 41"
          fill="none"
          stroke={`url(#${strokeId})`}
          strokeWidth="3.2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M 15.6 27 L 32.4 27"
          fill="none"
          stroke={`url(#${strokeId})`}
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.9"
        />
      </g>

      <g className={styles.stars}>
        <circle cx="8" cy="41" r="1.8" fill="var(--logo-star)" />
        <circle cx="40" cy="41" r="1.8" fill="var(--logo-star)" />
      </g>

      <g className={styles.apex}>
        <circle cx="24" cy="7" r="3.6" fill="var(--logo-halo)" opacity="0.35" />
        <circle cx="24" cy="7" r="2.2" fill="var(--logo-apex)" />
      </g>
    </svg>
  );
}
