import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Badge, Card } from "@astraq/ui";
import { ReviewAccessManager } from "@/app/components/ReviewAccessManager";
import { getReviewAccess } from "@/lib/review-access-api";

export const metadata = {
  title: "Review accounts",
};

// Sign-ins made for a company to try the app (ROADMAP "Review access" side
// track, item 2), for the people named in the api's ADMIN_EMAILS. Everyone
// else gets the not-found page: the route doesn't say it exists.
export default async function ReviewAccessPage() {
  await connection();
  const read = await getReviewAccess();
  if (read.kind === "forbidden") notFound();

  return (
    <main className="grid gap-7">
      <Card className="grid gap-3 p-7">
        <h1 className="m-0 font-display text-3xl font-bold tracking-tight text-foreground">
          Review accounts
        </h1>
        <p className="m-0 max-w-3xl leading-7 text-secondary">
          A sign-in you make for a company: an email, a generated password, and
          an end date. It stops working at the end date or when you revoke it,
          and both sign them out. They get their own watchlists and paper
          portfolio, nothing of yours, and no admin pages.
        </p>
        {read.kind === "unavailable" ? (
          <p className="m-0 flex flex-wrap items-center gap-3 text-secondary">
            <Badge tone="neutral">Unavailable</Badge>
            <span>The api didn&apos;t answer. Reload to try again.</span>
          </p>
        ) : null}
      </Card>

      {read.kind === "ok" ? (
        <ReviewAccessManager accounts={read.accounts} />
      ) : null}
    </main>
  );
}
