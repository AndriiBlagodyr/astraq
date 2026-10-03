import Link from "next/link";
import { Card, Feedback, buttonVariants } from "@astraq/ui";

export const metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <Card className="grid w-[min(27.5rem,100%)] gap-6 p-7">
      <header className="grid gap-2">
        <p className="m-0 text-xs font-semibold tracking-[0.16em] text-brand-strong-fg uppercase">
          Phase 2 · Auth
        </p>
        <h1 className="m-0 font-display text-3xl font-bold tracking-tight text-foreground">
          Create a Veracand account
        </h1>
        <p className="m-0 leading-7 text-secondary">
          Accounts hold your watchlists, paper trades, and saved strategies.
          Registration is invite-only: only emails on the invite list can sign
          up, and passwords are hashed with Argon2id.
        </p>
      </header>

      <Feedback
        title="Registration isn't available yet"
        description="Accounts arrive in Phase 2. Email verification follows in Phase 7."
      />

      <footer className="flex border-t border-border pt-5">
        <Link
          href="/login"
          className={buttonVariants({ variant: "secondary", size: "sm" })}
        >
          Already have an account? Sign in
        </Link>
      </footer>
    </Card>
  );
}
