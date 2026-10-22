import Link from "next/link";
import { Card, Feedback, buttonVariants } from "@astraq/ui";

export const metadata = {
  title: "Forgot password",
};

export default function ForgotPasswordPage() {
  return (
    <Card className="grid w-[min(27.5rem,100%)] gap-6 p-7">
      <header className="grid gap-2">
        <p className="m-0 text-xs font-semibold tracking-[0.16em] text-brand-strong-fg uppercase">
          Phase 7 · Auth
        </p>
        <h1 className="m-0 font-display text-3xl font-bold tracking-tight text-foreground">
          Reset your password
        </h1>
        <p className="m-0 leading-7 text-secondary">
          Enter the email associated with your Veracand account and we&apos;ll
          send a single-use reset link. Tokens expire in 30 minutes and rotate
          on use to detect replay attempts.
        </p>
      </header>

      <Feedback
        title="Password reset isn't available yet"
        description="It needs email delivery, which arrives in Phase 7. The flow will be throttled, and its success message won't reveal whether an account exists."
      />

      <footer className="flex border-t border-border pt-5">
        <Link
          href="/login"
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          Back to sign in
        </Link>
      </footer>
    </Card>
  );
}
