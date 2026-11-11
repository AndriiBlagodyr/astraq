import { Card } from "@astraq/ui";
import { ProfileForm } from "@/app/components/ProfileForm";
import { getAccount } from "@/lib/account";

export const metadata = {
  title: "Settings",
};

const memberSince = new Intl.DateTimeFormat("en-US", {
  dateStyle: "long",
  timeZone: "UTC",
});

// Profile (docs/ui-plan.md § Settings): the display name, and the email,
// read-only until verification exists in Phase 7.
export default async function ProfileSettingsPage() {
  const account = await getAccount();

  return (
    <Card className="grid gap-6 p-7">
      <div className="grid gap-1">
        <h2 className="m-0 font-display text-xl font-bold text-foreground">
          Profile
        </h2>
        <p className="m-0 text-sm text-secondary">
          Member since{" "}
          <time dateTime={account.createdAt}>
            {memberSince.format(new Date(account.createdAt))}
          </time>
          .
        </p>
      </div>
      <ProfileForm email={account.email} name={account.name} />
    </Card>
  );
}
