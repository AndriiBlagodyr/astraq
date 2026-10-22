import { SHARED_TOKENS } from "../tokens/schema";

/**
 * Spring presets as plain config objects. The shape is the `motion` library's
 * spring transition (`{ type, visualDuration, bounce }`), so apps pass a
 * preset straight to it: `<motion.div transition={springs.snappy} />`. The
 * package itself depends on no animation library; `springEasing` turns a
 * preset into a CSS `linear()` easing for plain transitions.
 *
 * `visualDuration` reads the motion tokens, so a spring "looks done" when a
 * token transition of the same name would be. The tail settles after that.
 *
 * Springs don't read the CSS tokens at runtime, so they don't drop to 0ms
 * under reduced motion by themselves (docs/motion-and-delight-plan.md, rule
 * 3). With `motion`, wrap the app in `<MotionConfig reducedMotion="user">`;
 * with CSS, pair the easing with `motion-reduce:transition-none`.
 */
export type SpringPreset = {
  readonly type: "spring";
  /** Seconds until the spring visually arrives (the overshoot tail excluded). */
  readonly visualDuration: number;
  /** 0 is critically damped (no overshoot); higher bounces more. */
  readonly bounce: number;
};

function seconds(token: keyof typeof SHARED_TOKENS) {
  return Number.parseFloat(SHARED_TOKENS[token]) / 1000;
}

export const springs = {
  /** Hover, press, toggles, number ticks: arrives fast, no overshoot. */
  snappy: { type: "spring", visualDuration: seconds("motion-fast"), bounce: 0 },
  /** Panels and larger moves: unhurried, no overshoot. */
  gentle: { type: "spring", visualDuration: seconds("motion-slow"), bounce: 0 },
  /** A small, confident settle for confirmations. Use sparingly. */
  bouncySubtle: { type: "spring", visualDuration: seconds("motion-base"), bounce: 0.25 },
} as const satisfies Record<string, SpringPreset>;

export type SpringName = keyof typeof springs;

/**
 * The spring as a damped harmonic oscillator (mass 1), using `motion`'s
 * mapping from visualDuration + bounce, so CSS and JS springs match.
 */
function oscillator({ visualDuration, bounce }: SpringPreset) {
  const omega = (2 * Math.PI) / (visualDuration * 1.2);
  const zeta = Math.min(1, Math.max(0.05, 1 - bounce));
  const decay = zeta * omega;

  if (zeta >= 1) {
    return {
      position: (t: number) => 1 - Math.exp(-omega * t) * (1 + omega * t),
      envelope: (t: number) => Math.exp(-omega * t) * (1 + omega * t),
    };
  }

  const damped = omega * Math.sqrt(1 - zeta * zeta);
  return {
    position: (t: number) =>
      1 - Math.exp(-decay * t) * (Math.cos(damped * t) + (decay / damped) * Math.sin(damped * t)),
    // Upper bound of the oscillation's amplitude, for the settle check.
    envelope: (t: number) => Math.exp(-decay * t) * (1 + decay / damped),
  };
}

const SETTLE_THRESHOLD = 0.001;
const MAX_SECONDS = 3;

/**
 * Samples the spring into a CSS `linear()` easing and the duration it needs
 * to settle. Use both together:
 *
 * ```ts
 * const { easing, duration } = springEasing(springs.snappy);
 * style={{ transitionTimingFunction: easing, transitionDuration: duration }}
 * ```
 */
export function springEasing(preset: SpringPreset, samples = 40) {
  const { position, envelope } = oscillator(preset);

  let settle = 0;
  while (settle < MAX_SECONDS && envelope(settle) > SETTLE_THRESHOLD) settle += 0.001;

  const points = Array.from({ length: samples + 1 }, (_, index) => {
    if (index === 0) return 0;
    if (index === samples) return 1;
    return Math.round(position((settle * index) / samples) * 1000) / 1000;
  });

  return {
    easing: `linear(${points.join(", ")})`,
    duration: `${Math.round(settle * 1000)}ms`,
    points,
  };
}
