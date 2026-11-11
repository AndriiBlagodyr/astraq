import { Card } from "@astraq/ui";
import { SessionsTable } from "@/app/components/SessionsTable";
import { SignOutEverywhereButton } from "@/app/components/SignOutEverywhereButton";
import { listSessions } from "@/lib/account";

export const metadata = {
  title: "Sessions",
};

// Sessions (docs/ui-plan.md § Settings): every device signed in to the
// account, with sign-out per device and "Log out everywhere", which
// revokes the whole family of refresh tokens on every device (ADR 0006).
export default async function SessionsSettingsPage() {
  const sessions = await listSessions();

  return (
    <Card className="grid gap-5 p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1">
          <h2 className="m-0 font-display text-xl font-bold text-foreground">
            Signed-in devices
          </h2>
          <p className="m-0 max-w-2xl text-sm leading-6 text-secondary">
            Each row is one sign-in. A device stays signed in for up to 30 days
            of use; signing it out here ends it at once, wherever it is.
          </p>
        </div>
        <SignOutEverywhereButton count={sessions.length} />
      </div>
      <SessionsTable sessions={sessions} />
    </Card>
  );
}
