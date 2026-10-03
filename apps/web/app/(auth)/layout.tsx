import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@astraq/ui";
import { VeracandLogo } from "@/app/components/VeracandLogo";
import { ThemeToggle } from "@/app/components/ThemeToggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen grid-rows-[auto_1fr_auto] gap-6 px-4 py-[18px] sm:p-6">
      <header className="mx-auto w-full max-w-[73.75rem]">
        <Card className="flex items-center justify-between gap-4 px-[18px] py-3.5">
          <Link
            href="/"
            className="inline-flex items-center gap-3 text-foreground"
          >
            <VeracandLogo decorative className="size-10" />
            <span className="font-display font-bold tracking-[0.02em]">
              Veracand
            </span>
          </Link>
          <ThemeToggle />
        </Card>
      </header>

      <main className="grid w-full place-items-center">{children}</main>

      <footer className="mx-auto max-w-[45rem] text-center text-sm leading-relaxed text-muted">
        <p className="m-0">
          Veracand is a personal trading research lab. Use it for learning and
          your own portfolio only — not for redistributing market data.
        </p>
      </footer>
    </div>
  );
}
