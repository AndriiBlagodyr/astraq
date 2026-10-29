import { Card } from "@astraq/ui";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Sign in",
};

export default function LoginPage() {
  return (
    <Card className="grid w-[min(27.5rem,100%)] gap-6 p-7">
      <header className="grid gap-2">
        <h1 className="m-0 font-display text-3xl font-bold tracking-tight text-foreground">
          Welcome back
        </h1>
        <p className="m-0 leading-7 text-secondary">
          Sign in to Veracand with your email and password.
        </p>
      </header>

      <LoginForm />
    </Card>
  );
}
