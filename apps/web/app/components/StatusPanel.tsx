import type { ReactNode } from "react";
import { Card, CardDescription } from "@astraq/ui";

type StatusPanelProps = {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  /** Links or buttons, or a spinner while loading. */
  children?: ReactNode;
};

/** The full-page panel behind the root error, not-found, and loading screens. */
export function StatusPanel({
  eyebrow,
  title,
  description,
  children,
}: StatusPanelProps) {
  return (
    <main className="grid min-h-[70vh] place-items-center p-6">
      <Card className="grid w-[min(100%,38.75rem)] gap-4 p-7">
        <p className="m-0 text-xs tracking-[0.16em] text-brand-strong-fg uppercase">
          {eyebrow}
        </p>
        <h1 className="m-0 font-display text-[clamp(2rem,4vw,3rem)] font-bold text-foreground">
          {title}
        </h1>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {children ? (
          <div className="mt-2 flex flex-wrap gap-3">{children}</div>
        ) : null}
      </Card>
    </main>
  );
}
