import Link from "next/link";
import { Card, Feedback, buttonVariants } from "@astraq/ui";

export const metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <Card className="grid w-[min(27.5rem,100%)] gap-6 p-7">
      <header className="grid gap-2">
        <p className="m-0 text-xs font-semibold tracking-[0.16em] text-brand-strong uppercase">
          Phase 3 · Auth
        </p>
        <h1 className="m-0 font-display text-3xl font-bold tracking-tight text-foreground">
          Create an Astraq account
        </h1>
        <p className="m-0 leading-7 text-secondary">
          Sign up to claim watchlists, paper trades, and saved strategies. Phase
          3 will hash passwords with Argon2id, send a verification email through
          Mailhog locally, and assign the default <code>user</code> role.
        </p>
      </header>

      <Feedback
        title="Registration form placeholder"
        description="Name, email, password strength, confirmation, and verification states will be added with production authentication."
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
