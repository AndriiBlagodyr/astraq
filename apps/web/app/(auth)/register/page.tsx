import { Card } from "@astraq/ui";
import { RegisterForm } from "./RegisterForm";

export const metadata = {
  title: "Create account",
};

export default function RegisterPage() {
  return (
    <Card className="grid w-[min(27.5rem,100%)] gap-6 p-7">
      <header className="grid gap-2">
        <h1 className="m-0 font-display text-3xl font-bold tracking-tight text-foreground">
          Create a Veracand account
        </h1>
        <p className="m-0 leading-7 text-secondary">
          Accounts hold your watchlists, paper trades, and saved strategies.
          Registration is invite-only — only emails on the allowlist can sign up.
          Passwords are hashed with Argon2id.
        </p>
      </header>

      <RegisterForm />
    </Card>
  );
}
