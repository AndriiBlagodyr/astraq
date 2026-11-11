"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Keyboard, LogOut, Settings } from "lucide-react";
import {
  Avatar,
  AvatarFallback,
  Menu,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuLinkItem,
  MenuSeparator,
  MenuShortcut,
  MenuTrigger,
  useToastManager,
} from "@astraq/ui";
import type { Account } from "@/lib/account";
import { displayName, initials } from "@/lib/sessions";
import { useCommandPalette } from "./CommandPalette";

/**
 * The top bar's user menu (docs/ui-plan.md § App shell, Phase 2): who is
 * signed in, Settings, the shortcut overlay, and Sign out. The avatar
 * shows initials; there are no profile pictures.
 */
export function UserMenu({ account }: { account: Account }) {
  const router = useRouter();
  const toast = useToastManager();
  const { openShortcuts } = useCommandPalette();
  const [pending, startTransition] = useTransition();
  const name = displayName(account.name, account.email);

  function signOut() {
    startTransition(async () => {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        toast.add({
          title: "Couldn't sign out",
          type: "danger",
          priority: "high",
        });
        return;
      }
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <Menu>
      <MenuTrigger
        aria-label={`Account menu for ${name}`}
        disabled={pending}
        className="inline-flex cursor-pointer items-center rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
      >
        <Avatar size="md">
          <AvatarFallback>
            {initials(account.name, account.email)}
          </AvatarFallback>
        </Avatar>
      </MenuTrigger>
      <MenuContent align="end" className="min-w-56">
        <MenuGroup>
          <MenuGroupLabel className="normal-case tracking-normal">
            <span className="block truncate font-semibold text-foreground">
              {name}
            </span>
            {account.name ? (
              <span className="block truncate font-normal text-muted">
                {account.email}
              </span>
            ) : null}
          </MenuGroupLabel>
        </MenuGroup>
        <MenuSeparator />
        <MenuLinkItem href="/settings">
          <Settings aria-hidden="true" />
          Settings
          <MenuShortcut>g e</MenuShortcut>
        </MenuLinkItem>
        <MenuItem onClick={openShortcuts}>
          <Keyboard aria-hidden="true" />
          Keyboard shortcuts
          <MenuShortcut>?</MenuShortcut>
        </MenuItem>
        <MenuSeparator />
        <MenuItem onClick={signOut}>
          <LogOut aria-hidden="true" />
          Sign out
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}
