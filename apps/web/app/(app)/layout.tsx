import type { ReactNode } from "react";
import Link from "next/link";
import { Card } from "@astraq/ui";
import { AppNavigation } from "@/app/components/AppNavigation";
import { CommandPaletteProvider } from "@/app/components/CommandPalette";
import { PaletteTrigger } from "@/app/components/PaletteTrigger";
import { RouteTransition } from "@/app/components/RouteTransition";
import { ThemeMenu } from "@/app/components/ThemeMenu";
import { UserMenu } from "@/app/components/UserMenu";
import { VeracandLogo } from "@/app/components/VeracandLogo";
import { getAccount } from "@/lib/account";

// The signed-in shell. It loads the account for the user menu, so a page
// behind it always has a session (userApi sends a visitor to /login).
export default async function ProductLayout({
  children,
}: {
  children: ReactNode;
}) {
  const account = await getAccount();

  return (
    // The provider owns the ⌘K palette, the `?` overlay, and the key listener.
    <CommandPaletteProvider>
      {/* Sidebar beside the content from 70rem (1120px); stacked above it below. */}
      <div className="grid min-h-screen gap-5 p-4 sm:p-5 min-[70rem]:grid-cols-[17.5rem_minmax(0,1fr)]">
        <aside className="min-[70rem]:sticky min-[70rem]:top-5 min-[70rem]:self-start">
          <Card className="grid gap-6 p-5">
            <Link href="/" className="flex items-center gap-3.5">
              <VeracandLogo decorative className="size-[38px]" />
              <div>
                <p className="m-0 font-display text-[1.08rem] font-bold text-foreground">
                  Veracand
                </p>
                <p className="mt-1 mb-0 text-sm text-muted">
                  Market research lab
                </p>
              </div>
            </Link>

            <AppNavigation />
          </Card>
        </aside>

        <div className="grid min-w-0 content-start gap-[18px]">
          <header>
            <Card className="flex items-center justify-between gap-4 px-4 py-3">
              <PaletteTrigger />
              <div className="flex items-center gap-3">
                <ThemeMenu />
                <UserMenu account={account} />
              </div>
            </Card>
          </header>

          <RouteTransition>{children}</RouteTransition>
        </div>
      </div>
    </CommandPaletteProvider>
  );
}
