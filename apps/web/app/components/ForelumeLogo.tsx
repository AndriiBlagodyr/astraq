import { useId } from "react";
import styles from "./ForelumeLogo.module.css";

type ForelumeLogoProps = {
  className?: string;
  /**
   * When true, marks the SVG as decorative (aria-hidden) and skips the
   * embedded title. Use when a sibling element already labels the brand.
   */
  decorative?: boolean;
};

/**
 * Forelume mark — "light ahead". A price history runs inside a lens ring to a
 * glowing "now" node, then escapes through the ring's opening as a forecast
 * cone that carries a spark: the predicted target. Colors come from the
 * `--ds-brand-*` tokens, so the mark follows every theme and color mode.
 */
export function ForelumeLogo({ className, decorative = false }: ForelumeLogoProps) {
  const reactId = useId().replace(/:/g, "");
  const titleId = `${reactId}-title`;
  const ringId = `${reactId}-ring`;
  const coneId = `${reactId}-cone`;
  const haloId = `${reactId}-halo`;

  const rootClassName = [styles.logo, className].filter(Boolean).join(" ");
  const a11yProps = decorative
    ? { "aria-hidden": true as const, focusable: false as const }
    : { role: "img" as const, "aria-labelledby": titleId };

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={rootClassName}
      {...a11yProps}
    >
      {!decorative ? <title id={titleId}>Forelume</title> : null}

      <defs>
        <linearGradient
          id={ringId}
          x1="6"
          y1="42"
          x2="30"
          y2="6"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="var(--logo-deep)" />
          <stop offset="1" stopColor="var(--logo-primary)" />
        </linearGradient>

        {/* Forecast confidence: bright at "now", fading into the future. */}
        <linearGradient
          id={coneId}
          x1="24"
          y1="22"
          x2="46"
          y2="17"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="var(--logo-primary)" stopOpacity="0.7" />
          <stop offset="0.6" stopColor="var(--logo-spark)" stopOpacity="0.38" />
          <stop offset="1" stopColor="var(--logo-spark)" stopOpacity="0" />
        </linearGradient>

        <radialGradient id={haloId} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="var(--logo-primary)" stopOpacity="0.6" />
          <stop offset="1" stopColor="var(--logo-primary)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Lens ring, open to the right: the future side. */}
      <path
        d="M 34.93 15.25 A 17 17 0 1 0 34.93 34.75"
        stroke={`url(#${ringId})`}
        strokeWidth="2.6"
        strokeLinecap="round"
      />

      <path
        d="M 24 22 L 45 9 L 45 25 Z"
        fill={`url(#${coneId})`}
        className={styles.cone}
      />
      <path
        d="M 24 22 L 40.5 13.8"
        stroke="var(--logo-primary)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeDasharray="1.4 2.6"
        className={styles.forecast}
      />

      <path
        d="M 9 32 L 14 26 L 18 29.5 L 24 22"
        stroke="var(--logo-primary)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className={styles.history}
      />

      <g className={styles.now}>
        <circle cx="24" cy="22" r="6" fill={`url(#${haloId})`} />
        <circle cx="24" cy="22" r="2.9" fill="var(--logo-core)" />
        <circle cx="24" cy="22" r="1.3" fill="var(--logo-core-inner)" />
      </g>

      {/* The lume: a four-point spark at the forecast target. */}
      <path
        d="M 41 8.6 Q 41.7 12.8 45.4 13.5 Q 41.7 14.2 41 18.4 Q 40.3 14.2 36.6 13.5 Q 40.3 12.8 41 8.6 Z"
        fill="var(--logo-spark)"
        className={styles.spark}
      />
    </svg>
  );
}
