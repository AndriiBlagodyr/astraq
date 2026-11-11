import type { ReactNode } from "react";
import { Card } from "@astraq/ui";
import { SettingsNav } from "@/app/components/SettingsNav";

// Settings (docs/ui-plan.md § Settings): Profile and Sessions in Phase 2;
// Security and API keys join in Phase 7. Appearance stays in the top-bar
// theme menu, because it works before sign-in.
export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid gap-5">
      <Card className="grid gap-5 p-7">
        <div className="grid gap-2">
          <h1 className="m-0 font-display text-3xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="m-0 max-w-2xl leading-7 text-secondary">
            Your account and the devices signed in to it. Theme, mode, and
            density live in the top bar.
          </p>
        </div>
        <SettingsNav />
      </Card>
      {children}
    </main>
  );
}
