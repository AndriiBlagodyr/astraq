"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Check, Copy, KeyRound, Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTrigger,
  Badge,
  Button,
  Card,
  Checkbox,
  EmptyState,
  FormField,
  Input,
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
import {
  createReviewAccess,
  extendReviewAccess,
  resetReviewAccessPassword,
  revokeReviewAccess,
} from "@/app/(app)/admin/actions";
import {
  type ReviewAccess,
  type ReviewAccessCredentials,
  accessStateBadge,
  dateInputValue,
  defaultEndDate,
  endOfDay,
  passwordStatus,
  signInLink,
} from "@/lib/review-access";

// Formatted in the viewer's time zone, so the <time> elements opt out of
// the hydration check (see SessionsTable).
const day = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
const moment = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

function When({
  value,
  format = moment,
}: {
  value: string | null;
  format?: Intl.DateTimeFormat;
}) {
  if (!value) return <span>—</span>;
  return (
    <time dateTime={value} suppressHydrationWarning>
      {format.format(new Date(value))}
    </time>
  );
}

function CopyButton({ label, text }: { label: string; text: string }) {
  const toast = useToastManager();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.add({
        title: "Couldn't copy",
        description: "Select the text and copy it by hand.",
        type: "danger",
      });
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={copy}>
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copied ? "Copied" : label}
    </Button>
  );
}

/**
 * The one time a password can be read: right after an account is made or
 * its password reset. It lives in this component's state only, so a reload
 * loses it and "Reset password" is the way to get another.
 */
function Credentials({
  credentials,
  onDismiss,
}: {
  credentials: ReviewAccessCredentials;
  onDismiss: () => void;
}) {
  const { account, password } = credentials;
  const link = signInLink(window.location.origin, account.email);
  const message = [
    `Sign in: ${link}`,
    `Email: ${account.email}`,
    `Password: ${password}`,
  ].join("\n");

  return (
    <Card
      role="status"
      className="grid gap-4 border-focus-ring p-7"
      data-slot="review-credentials"
    >
      <div className="grid gap-1">
        <h2 className="m-0 font-display text-xl font-bold tracking-tight text-foreground">
          Sign-in for {account.company}
        </h2>
        <p className="m-0 max-w-2xl text-sm leading-6 text-secondary">
          Copy the password now: it is shown this once and stored only as a
          hash.{" "}
          {account.sharedCredentials
            ? "It stays the password for as long as the account is open."
            : "They are asked to replace it at their first sign-in."}
        </p>
      </div>
      <dl className="m-0 grid gap-3 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-5">
        <dt className="text-muted">Link</dt>
        <dd className="m-0 break-all font-mono text-foreground">{link}</dd>
        <dt className="text-muted">Email</dt>
        <dd className="m-0 break-all font-mono text-foreground">
          {account.email}
        </dd>
        <dt className="text-muted">Password</dt>
        <dd className="m-0 break-all font-mono text-foreground">{password}</dd>
      </dl>
      <div className="flex flex-wrap items-center gap-3">
        <CopyButton label="Copy all three" text={message} />
        <CopyButton label="Copy link" text={link} />
        <CopyButton label="Copy password" text={password} />
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Done
        </Button>
      </div>
    </Card>
  );
}

function CreateForm({
  onCreated,
}: {
  onCreated: (credentials: ReviewAccessCredentials) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const expiresAt = endOfDay(String(data.get("endDate") ?? ""));
    if (!expiresAt) {
      setError("Pick an end date");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createReviewAccess({
        email: String(data.get("email") ?? ""),
        company: String(data.get("company") ?? ""),
        note: String(data.get("note") ?? ""),
        expiresAt,
        sharedCredentials: shared,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      form.reset();
      setShared(false);
      onCreated(result.value);
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FormField label="Company">
          <Input name="company" maxLength={120} autoComplete="off" required />
        </FormField>
        <FormField
          label="Email"
          description="What they sign in with. No mail is sent to it."
        >
          <Input
            name="email"
            type="email"
            maxLength={254}
            autoComplete="off"
            required
          />
        </FormField>
        <FormField
          label="Access until"
          description="Through the end of that day."
        >
          <Input
            name="endDate"
            type="date"
            defaultValue={defaultEndDate(new Date())}
            min={dateInputValue(new Date())}
            required
            suppressHydrationWarning
          />
        </FormField>
        <FormField label="Note" description="For you only.">
          <Input name="note" maxLength={500} autoComplete="off" />
        </FormField>
      </div>

      <label className="flex max-w-2xl items-start gap-3 text-sm leading-6 text-secondary">
        <Checkbox
          checked={shared}
          onCheckedChange={setShared}
          className="mt-0.5"
        />
        <span>
          <span className="font-semibold text-foreground">
            Several people will share this sign-in.
          </span>{" "}
          The password then can&apos;t be changed, so one of them can&apos;t
          lock the others out. Left off, the first sign-in must set a new
          password before anything else.
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending}>
          <Plus aria-hidden="true" />
          Create account
        </Button>
        {error ? (
          <p role="alert" className="m-0 text-sm text-negative-fg">
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

function Row({
  account,
  onCredentials,
}: {
  account: ReviewAccess;
  onCredentials: (credentials: ReviewAccessCredentials) => void;
}) {
  const toast = useToastManager();
  const [pending, startTransition] = useTransition();
  // The date the end-date form opens with; null while it is closed.
  const [editing, setEditing] = useState<string | null>(null);
  // A reset can't be undone (the password they hold stops working at
  // once), so it asks first. A revoke doesn't: a new end date reopens it.
  const [resetting, setResetting] = useState(false);
  const badge = accessStateBadge[account.state];

  const fail = (title: string, description: string) =>
    toast.add({ title, description, type: "danger", priority: "high" });

  function revoke() {
    startTransition(async () => {
      const result = await revokeReviewAccess(account.id);
      if (!result.ok) return void fail("Couldn't revoke", result.error);
      toast.add({
        title: `${account.company} is signed out`,
        description:
          "Sign-in is closed. A page they have open stops within ten minutes.",
      });
    });
  }

  function reset() {
    startTransition(async () => {
      const result = await resetReviewAccessPassword(account.id);
      if (!result.ok) return void fail("Couldn't reset", result.error);
      setResetting(false);
      onCredentials(result.value);
    });
  }

  function extend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = new FormData(event.currentTarget).get("endDate");
    const expiresAt = endOfDay(String(value ?? ""));
    if (!expiresAt) return;
    startTransition(async () => {
      const result = await extendReviewAccess(account.id, expiresAt);
      if (!result.ok) return void fail("Couldn't change the date", result.error);
      setEditing(null);
      toast.add({
        title: `${account.company} has access until ${day.format(new Date(expiresAt))}`,
        type: "success",
      });
    });
  }

  return (
    <Tr>
      <Td>
        <span className="font-semibold text-foreground">{account.company}</span>
        <span className="block break-all font-mono text-sm text-secondary">
          {account.email}
        </span>
        {account.note ? (
          <span className="block text-sm text-muted">{account.note}</span>
        ) : null}
      </Td>
      <Td>
        <Badge tone={badge.tone}>{badge.label}</Badge>
      </Td>
      <Td className="text-sm text-muted">
        {editing !== null ? (
          <form onSubmit={extend} className="flex flex-wrap items-center gap-2">
            <Input
              name="endDate"
              type="date"
              size="sm"
              aria-label={`Access until, for ${account.company}`}
              defaultValue={editing}
              min={dateInputValue(new Date())}
              className="w-auto"
              required
            />
            <Button type="submit" size="sm" loading={pending}>
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <When value={account.expiresAt} format={day} />
        )}
      </Td>
      <Td className="text-sm text-muted">
        <When value={account.lastSignInAt} />
      </Td>
      <Td className="text-sm text-muted">{passwordStatus(account)}</Td>
      <Td className="text-right">
        <span className="inline-flex flex-wrap justify-end gap-1">
          {editing !== null ? null : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                // An open account keeps its date; a closed one starts from
                // two weeks ahead, since its own date may be in the past.
                setEditing(
                  account.state === "active"
                    ? dateInputValue(new Date(account.expiresAt))
                    : defaultEndDate(new Date())
                )
              }
            >
              {account.state === "active" ? "Change date" : "Reopen"}
            </Button>
          )}
          <AlertDialog open={resetting} onOpenChange={setResetting}>
            <AlertDialogTrigger
              render={<Button variant="ghost" size="sm" disabled={pending} />}
            >
              <KeyRound aria-hidden="true" />
              Reset password
            </AlertDialogTrigger>
            <AlertDialogContent
              title={`Reset the password for ${account.company}?`}
              description={
                account.sharedCredentials
                  ? "The password they have stops working and they are signed out everywhere. You get a new one to send them."
                  : "The password they have stops working and they are signed out everywhere. You get a new one to send them, which they replace at their next sign-in."
              }
            >
              <AlertDialogFooter>
                <AlertDialogClose render={<Button variant="secondary" />}>
                  Keep it
                </AlertDialogClose>
                <Button variant="danger" loading={pending} onClick={reset}>
                  Reset password
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {account.state === "revoked" ? null : (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={revoke}
            >
              Revoke
            </Button>
          )}
        </span>
      </Td>
    </Tr>
  );
}

/**
 * /admin/access: make a review account, hand out its sign-in, and close it
 * (ROADMAP "Review access" side track, item 2). The password of a new or
 * reset account is shown above the form until it is dismissed.
 */
export function ReviewAccessManager({ accounts }: { accounts: ReviewAccess[] }) {
  const [credentials, setCredentials] =
    useState<ReviewAccessCredentials | null>(null);

  return (
    <>
      {credentials ? (
        <Credentials
          credentials={credentials}
          onDismiss={() => setCredentials(null)}
        />
      ) : null}

      <Card className="grid gap-5 p-7">
        <h2 className="m-0 font-display text-xl font-bold tracking-tight text-foreground">
          New review account
        </h2>
        <CreateForm onCreated={setCredentials} />
      </Card>

      {accounts.length === 0 ? (
        <EmptyState
          title="No review accounts yet"
          description="An account you make above appears here, with whether they have signed in."
        />
      ) : (
        <TableWrap>
          <Table>
            <TableCaption className="sr-only">
              Review accounts, newest first
            </TableCaption>
            <Thead>
              <Tr>
                <Th>Company</Th>
                <Th>State</Th>
                <Th>Access until</Th>
                <Th>Last sign-in</Th>
                <Th>Password</Th>
                <Th>
                  <span className="sr-only">Actions</span>
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {accounts.map((account) => (
                <Row
                  key={account.id}
                  account={account}
                  onCredentials={setCredentials}
                />
              ))}
            </Tbody>
          </Table>
        </TableWrap>
      )}
    </>
  );
}
