import { useId } from "react";
import styles from "./VeracandLogo.module.css";

type VeracandLogoProps = {
  /** Must include a size, e.g. `size-10`; the mark has none of its own. */
  className?: string;
  /**
   * When true, marks the SVG as decorative (aria-hidden) and skips the
   * embedded title. Use when a sibling element already labels the brand.
   */
  decorative?: boolean;
};

/**
 * Veracand mark — "vera cand(le)", the true candle. A V for Veracand whose
 * rising arm runs into a candlestick: the price that actually printed, drawn
 * brighter than the path that led to it. The spark beside it is the forecast
 * target. Colors come from the `--ds-brand-*` tokens, so the mark follows
 * every theme and color mode. `lib/brand-icon.ts` repeats this geometry for
 * the favicon; keep the two in sync.
 */
export function VeracandLogo({
  className,
  decorative = false,
}: VeracandLogoProps) {
  const titleId = `${useId().replace(/:/g, "")}-title`;

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
      {!decorative ? <title id={titleId}>Veracand</title> : null}

      {/* The V: a fall and a recovery, ending at the candle. */}
      <path
        d="M 5.5 13.5 L 18 40 L 29 27.5"
        stroke="var(--logo-path)"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className={styles.path}
      />

      {/* The true candle: wick and body. */}
      <g className={styles.candle}>
        <path
          d="M 32 8.5 V 29.5"
          stroke="var(--logo-candle)"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <rect
          x="28.3"
          y="12.5"
          width="7.4"
          height="13.5"
          rx="1.6"
          fill="var(--logo-candle)"
        />
      </g>

      {/* A four-point spark: the forecast target. */}
      <path
        d="M 41 6.2 Q 41.65 9.35 44.8 10 Q 41.65 10.65 41 13.8 Q 40.35 10.65 37.2 10 Q 40.35 9.35 41 6.2 Z"
        fill="var(--logo-spark)"
        className={styles.spark}
      />
    </svg>
  );
}
