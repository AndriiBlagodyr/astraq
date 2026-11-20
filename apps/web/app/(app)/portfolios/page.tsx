import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Card,
  EmptyState,
  Table,
  TableCaption,
  TableWrap,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from "@astraq/ui";
import { CreatePortfolioForm } from "@/app/components/CreatePortfolioForm";
import { SignedMoney } from "@/app/components/SignedMoney";
import { formatMoney, signedPercent } from "@/lib/format";
import {
  dayPnl,
  getEquityCurve,
  getPortfolio,
  listPortfolios,
  totalReturn,
} from "@/lib/portfolios";

export const metadata = {
  title: "Portfolios",
};

const dash = <span className="text-muted">—</span>;

// The portfolio index (docs/ui-plan.md § Portfolio): every paper portfolio
// with what it is worth and what it has made, and the form that opens a new
// one. With exactly one portfolio the menu's "Portfolio" goes straight to
// it; `?all` shows the list anyway, which is how its page links back here.
export default async function PortfoliosPage({
  searchParams,
}: {
  searchParams: Promise<{ all?: string | string[] }>;
}) {
  const [{ all }, summaries] = await Promise.all([
    searchParams,
    listPortfolios(),
  ]);
  if (summaries.length === 1 && all === undefined) {
    redirect(`/portfolios/${summaries[0]!.id}`);
  }

  // The index has no books, so each portfolio is read (and settled) on its
  // own, and its curve after it for the day PnL. A handful of requests: one
  // user's paper portfolios, not a table.
  const portfolios = (
    await Promise.all(
      summaries.map(async (summary) => {
        const portfolio = await getPortfolio(summary.id);
        if (!portfolio) return null;
        const curve = (await getEquityCurve(summary.id)) ?? [];
        return { ...portfolio, day: dayPnl(curve) };
      })
    )
  ).filter((portfolio) => portfolio !== null);

  return (
    <main className="grid gap-5">
      <Card className="grid gap-2 p-7">
        <h1 className="m-0 font-display text-3xl font-bold tracking-tight text-foreground">
          Portfolios
        </h1>
        <p className="m-0 max-w-2xl leading-7 text-secondary">
          Paper portfolios, each with its own cash and trading costs. Every
          figure is derived from the portfolio&apos;s ledger and priced at the
          latest stored close.
        </p>
      </Card>

      {portfolios.length === 0 ? (
        <Card className="p-7">
          <EmptyState
            title="No portfolios yet"
            description="Open one below with some paper cash. Its costs and limits are set when it is created."
          />
        </Card>
      ) : (
        <TableWrap scroll>
          <Table>
            <TableCaption className="sr-only">
              Your portfolios, oldest first, at the latest close
            </TableCaption>
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th align="end">Equity</Th>
                <Th align="end">Cash</Th>
                <Th align="end">Positions</Th>
                <Th align="end">Day PnL</Th>
                <Th align="end">Total return</Th>
              </Tr>
            </Thead>
            <Tbody>
              {portfolios.map((portfolio) => {
                const made = totalReturn(portfolio);
                return (
                  <Tr key={portfolio.id}>
                    <Td>
                      <Link
                        href={`/portfolios/${portfolio.id}`}
                        className="font-semibold text-foreground underline-offset-4 hover:underline"
                      >
                        {portfolio.name}
                      </Link>
                    </Td>
                    <Td align="end" className="tabular-nums">
                      {portfolio.equity === null
                        ? dash
                        : formatMoney(portfolio.equity)}
                    </Td>
                    <Td align="end" className="tabular-nums">
                      {formatMoney(portfolio.cash)}
                    </Td>
                    <Td align="end" className="tabular-nums">
                      {portfolio.positions.length}
                    </Td>
                    <Td align="end">
                      <SignedMoney value={portfolio.day?.amount ?? null} />
                    </Td>
                    <Td align="end">
                      <SignedMoney value={made?.amount ?? null} />
                      {made && made.ratio !== null ? (
                        <span className="block text-sm text-muted tabular-nums">
                          {signedPercent.format(made.ratio)}
                        </span>
                      ) : null}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>
        </TableWrap>
      )}

      <Card className="grid gap-5 p-7">
        <h2 className="m-0 font-display text-xl font-bold tracking-tight text-foreground">
          New portfolio
        </h2>
        <CreatePortfolioForm />
      </Card>
    </main>
  );
}
