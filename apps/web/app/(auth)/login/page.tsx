import Link from "next/link";
import { Card, Feedback, buttonVariants } from "@astraq/ui";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <Card className="grid w-[min(27.5rem,100%)] gap-6 p-7">
      <header className="grid gap-2">
        <p className="m-0 text-xs font-semibold tracking-[0.16em] text-brand-strong uppercase">
          Phase 3 · Auth
        </p>
        <h1 className="m-0 font-display text-3xl font-bold tracking-tight text-foreground">
          Welcome back to Astraq
        </h1>
        <p className="m-0 leading-7 text-secondary">
          Email + password sign-in. Once Phase 3 ships, this form will exchange
          your credentials for a JWT access token plus a rotating refresh cookie
          issued by <code>apps/api</code>.
        </p>
      </header>

      <Feedback
        title="Login form placeholder"
        description="Email and password fields will connect to the Phase 2 development auth shim before production auth ships."
      />

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <Link
          href="/forgot-password"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Forgot password?
        </Link>
        <Link href="/register" className={buttonVariants({ size: "sm" })}>
          Create account
        </Link>
      </footer>
    </Card>
  );
}
