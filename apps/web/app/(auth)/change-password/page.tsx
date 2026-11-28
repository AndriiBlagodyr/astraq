import { cookies } from "next/headers";
import { Card } from "@astraq/ui";
import { COOKIE_ACCESS, mustChangePassword } from "@/lib/auth-cookies";
import { ChangePasswordForm } from "./ChangePasswordForm";

export const metadata = {
  title: "Change password",
};

// Where proxy.ts keeps a session whose password must be replaced (a review
// account's first sign-in), and a page any signed-in user can open to
// change theirs. It needs a session: it isn't in the proxy's public paths.
export default async function ChangePasswordPage() {
  const token = (await cookies()).get(COOKIE_ACCESS)?.value;
  const required = token ? mustChangePassword(token) : false;

  return (
    <Card className="grid w-[min(27.5rem,100%)] gap-6 p-7">
      <header className="grid gap-2">
        <h1 className="m-0 font-display text-3xl font-bold tracking-tight text-foreground">
          {required ? "Choose your password" : "Change password"}
        </h1>
        <p className="m-0 leading-7 text-secondary">
          {required
            ? "The password you were sent works once. Set one only you know to open Veracand."
            : "Changing it signs out every other device."}
        </p>
      </header>

      <ChangePasswordForm />
    </Card>
  );
}
