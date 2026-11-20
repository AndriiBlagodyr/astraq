"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { trace } from "@opentelemetry/api";
import type { z } from "zod";
import {
  CashTransferBodySchema,
  CreatePortfolioBodySchema,
  IdempotencyKeySchema,
  PlaceOrderBodySchema,
  PortfolioIdParamSchema,
  PortfolioOrderParamSchema,
} from "@astraq/shared";
import {
  type ActionResult,
  done,
  failed,
  failure,
  firstIssue,
} from "@/lib/action-result";
import { problemDetail, requireSession, userApi } from "@/lib/api";
import type { Order, OrderPreview } from "@/lib/portfolios";

// The portfolio writes, as server actions (docs/ui-plan.md § Portfolio):
// validated with the shared schemas before they reach the api, like the
// watchlist actions. Amounts stay the strings the owner typed, less the
// thousands separators: the api does the arithmetic, in decimals.

// A no-op until lib/tracing.ts registers a provider.
const tracer = trace.getTracer("veracand-web");

const indexPath = "/portfolios";
const detailPath = (id: string) => `/portfolios/${id}` as Route;

/** Every page that shows the portfolio's books: the index and its three tabs. */
function revalidatePortfolio(id: string) {
  revalidatePath(indexPath);
  revalidatePath(detailPath(id));
  revalidatePath(`${detailPath(id)}/orders`);
  revalidatePath(`${detailPath(id)}/activity`);
}

/** A typed amount as the api takes it: "1,000.50" and " 1000.5 " are "1000.5". */
const amount = (value: FormDataEntryValue | null) =>
  typeof value === "string" ? value.replace(/[\s,]/g, "") : "";

/** An optional field: undefined when left empty, so the schema's default applies. */
const optional = (value: string) => (value === "" ? undefined : value);

const FIELD_LABELS: Record<string, string> = {
  name: "Name",
  startingCash: "Starting cash",
  slippageBps: "Slippage",
  commissionPerOrder: "Commission per order",
  commissionPerShare: "Commission per share",
  maxOrderNotional: "Largest order",
};

/** The first issue with its field's label: six fields share one error line. */
function labelledIssue(error: z.ZodError): string {
  const label = FIELD_LABELS[String(error.issues[0]?.path[0])];
  return label ? `${label}: ${firstIssue(error)}` : firstIssue(error);
}

/**
 * Creating from the index: a form action, so it works before hydration and
 * `useActionState` can show the error. Opens the new portfolio on success.
 */
export async function createPortfolio(
  _previous: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const slippage = amount(formData.get("slippageBps"));
  const parsed = CreatePortfolioBodySchema.safeParse({
    name: formData.get("name"),
    startingCash: amount(formData.get("startingCash")),
    slippageBps: slippage === "" ? undefined : Number(slippage),
    commissionPerOrder: optional(amount(formData.get("commissionPerOrder"))),
    commissionPerShare: optional(amount(formData.get("commissionPerShare"))),
    maxOrderNotional: optional(amount(formData.get("maxOrderNotional"))),
  });
  if (!parsed.success) return { error: labelledIssue(parsed.error) };

  const client = await userApi();
  const { data, response } = await client.POST("/api/portfolios", {
    body: parsed.data,
  });
  requireSession(response);
  if (!data) {
    return {
      error: await problemDetail(response, "Couldn't create the portfolio"),
    };
  }
  revalidatePath(indexPath);
  redirect(detailPath(data.id));
}

/**
 * The cash form's action: a deposit or a withdrawal, named by the button
 * that submitted it. The api settles the portfolio first, so a withdrawal
 * is checked against the cash left after every fill that has happened.
 */
export async function transferCash(
  _previous: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const parsed = PortfolioIdParamSchema.extend(
    CashTransferBodySchema.shape
  ).safeParse({
    id: formData.get("id"),
    type: formData.get("type"),
    amount: amount(formData.get("amount")),
  });
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const { id, ...body } = parsed.data;
  const client = await userApi();
  const { response } = await client.POST("/api/portfolios/{id}/transfers", {
    params: { path: { id } },
    body,
  });
  if (!response.ok) return failure(response, "Couldn't move the cash");
  revalidatePortfolio(id);
  return done;
}

/**
 * What placing the order now would do (the order ticket's preview and its
 * inline guards): when it fills, the estimated cost, the cash after, and
 * the api's refusal if it would refuse. Places nothing.
 */
export async function previewOrder(
  portfolioId: string,
  order: unknown
): Promise<ActionResult<OrderPreview>> {
  const id = PortfolioIdParamSchema.safeParse({ id: portfolioId });
  const body = PlaceOrderBodySchema.safeParse(order);
  if (!id.success) return failed(firstIssue(id.error));
  if (!body.success) return failed(firstIssue(body.error));

  const client = await userApi();
  const { data, response } = await client.POST(
    "/api/portfolios/{id}/orders/preview",
    { params: { path: id.data }, body: body.data }
  );
  if (!data) return failure(response, "Couldn't preview the order");
  return { ok: true, value: data };
}

/**
 * Places an order and answers with it as the api left it: `filled` or
 * `rejected` at once for a market order during the session, `open`
 * otherwise. `idempotencyKey` is made when the ticket opens, so a double
 * submit, or a retry after a dropped connection, places one order.
 */
export async function placeOrder(
  portfolioId: string,
  idempotencyKey: string,
  order: unknown
): Promise<ActionResult<Order>> {
  const id = PortfolioIdParamSchema.safeParse({ id: portfolioId });
  const key = IdempotencyKeySchema.safeParse(idempotencyKey);
  const body = PlaceOrderBodySchema.safeParse(order);
  if (!id.success) return failed(firstIssue(id.error));
  if (!key.success) return failed(firstIssue(key.error));
  if (!body.success) return failed(firstIssue(body.error));

  // One span per submitted ticket (ROADMAP Phase 3 item 7). The call to the
  // api is its child, and the api's `order.place` span continues the trace.
  return tracer.startActiveSpan(
    "order.submit",
    {
      attributes: {
        "portfolio.id": id.data.id,
        "order.ticker": body.data.ticker,
        "order.side": body.data.side,
        "order.type": body.data.type,
      },
    },
    async (span): Promise<ActionResult<Order>> => {
      try {
        const client = await userApi();
        const { data, response } = await client.POST(
          "/api/portfolios/{id}/orders",
          {
            params: { path: id.data, header: { "Idempotency-Key": key.data } },
            body: body.data,
          }
        );
        span.setAttribute("http.response.status_code", response.status);
        if (!data) return failure(response, "Couldn't place the order");
        span.setAttributes({
          "order.id": data.id,
          "order.status": data.status,
        });
        revalidatePortfolio(id.data.id);
        return { ok: true, value: data };
      } finally {
        span.end();
      }
    }
  );
}

/** Cancels an open order. One that has filled since the page rendered is the api's 409. */
export async function cancelOrder(
  portfolioId: string,
  orderId: string
): Promise<ActionResult> {
  const parsed = PortfolioOrderParamSchema.safeParse({
    id: portfolioId,
    orderId,
  });
  if (!parsed.success) return failed(firstIssue(parsed.error));

  const client = await userApi();
  const { response } = await client.POST(
    "/api/portfolios/{id}/orders/{orderId}/cancel",
    { params: { path: parsed.data } }
  );
  // The order's real state is on the server either way: show it.
  revalidatePortfolio(parsed.data.id);
  if (!response.ok) return failure(response, "Couldn't cancel the order");
  return done;
}
