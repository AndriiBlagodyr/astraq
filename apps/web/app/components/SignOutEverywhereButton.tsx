"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
  Button,
  useToastManager,
} from "@astraq/ui";

/**
 * "Log out everywhere" (ROADMAP Phase 2 item 1): revokes every session,
 * this one included, through the BFF, then goes to sign-in. It can't be
 * undone, so it asks first (docs/ui-plan.md § Shared patterns).
 */
export function SignOutEverywhereButton({ count }: { count: number }) {
  const router = useRouter();
  const toast = useToastManager();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function signOutEverywhere() {
    startTransition(async () => {
      const response = await fetch("/api/auth/logout-all", { method: "POST" });
      if (!response.ok) {
        toast.add({
          title: "Couldn't sign out everywhere",
          type: "danger",
          priority: "high",
        });
        return;
      }
      setOpen(false);
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger render={<Button variant="danger" size="sm" />}>
        <LogOut aria-hidden="true" />
        Log out everywhere
      </AlertDialogTrigger>
      <AlertDialogContent
        title="Log out everywhere?"
        description={`Every signed-in device (${count === 1 ? "this one" : `${count} of them`}) is signed out, including this one. You'll need to sign in again.`}
      >
        <AlertDialogFooter>
          <AlertDialogClose render={<Button variant="secondary" />}>
            Keep me signed in
          </AlertDialogClose>
          <Button
            variant="danger"
            loading={pending}
            onClick={signOutEverywhere}
          >
            Log out everywhere
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
