"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Button,
  Table,
  TableCaption,
  TableWrap,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  useToastManager,
} from "@astraq/ui";
import { revokeSession } from "@/app/(app)/settings/actions";
import type { AccountSession } from "@/lib/account";
import { describeUserAgent } from "@/lib/sessions";

const when = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

/**
 * The signed-in devices. Signing one out removes its row at once through
 * `useOptimistic` and settles with the server's list; a failure snaps back
 * with a toast. Signing out the current device ends this session, so it
 * goes to the sign-in page.
 */
export function SessionsTable({ sessions }: { sessions: AccountSession[] }) {
  const router = useRouter();
  const toast = useToastManager();
  const [, startTransition] = useTransition();
  const [visible, remove] = useOptimistic(
    sessions,
    (current: AccountSession[], id: string) =>
      current.filter((session) => session.id !== id)
  );

  function signOut(session: AccountSession) {
    startTransition(async () => {
      remove(session.id);
      const result = await revokeSession(session.id);
      if (!result.ok) {
        toast.add({ title: result.error, type: "danger", priority: "high" });
        return;
      }
      if (session.current) {
        // The api has revoked it; the BFF clears the cookies.
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
        return;
      }
      toast.add({
        title: `Signed out ${describeUserAgent(session.userAgent)}`,
        type: "success",
      });
    });
  }

  return (
    <TableWrap>
      <Table>
        <TableCaption className="sr-only">
          Devices signed in to your account, newest first
        </TableCaption>
        <Thead>
          <Tr>
            <Th>Device</Th>
            <Th>IP address</Th>
            <Th>Signed in</Th>
            <Th>Last used</Th>
            <Th>
              <span className="sr-only">Actions</span>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {visible.map((session) => (
            <Tr key={session.id}>
              <Td>
                <span className="font-semibold text-foreground">
                  {describeUserAgent(session.userAgent)}
                </span>
                {session.current ? (
                  <Badge tone="brand" className="ml-2">
                    This device
                  </Badge>
                ) : null}
              </Td>
              <Td className="font-mono text-sm text-secondary">
                {session.ip ?? "—"}
              </Td>
              <Td className="text-sm text-muted">
                <time dateTime={session.createdAt}>
                  {when.format(new Date(session.createdAt))}
                </time>
              </Td>
              <Td className="text-sm text-muted">
                <time dateTime={session.lastUsedAt}>
                  {when.format(new Date(session.lastUsedAt))}
                </time>
              </Td>
              <Td className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut(session)}
                >
                  Sign out
                </Button>
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableWrap>
  );
}
