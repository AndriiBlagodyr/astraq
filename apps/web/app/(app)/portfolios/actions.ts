"use server";

import type { Route } from "next";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import {
  CashTransferBodySchema,
  CreatePortfolioBodySchema,
  PortfolioIdParamSchema,
} from "@astraq/shared";
import {
  type ActionResult,
  done,
  failed,
  failure,
  firstIssue,
} from "@/lib/action-result";
import { problemDetail, requireSession, userApi } from "@/lib/api";

// The portfolio writes, as server actions (docs/ui-plan.md § Portfolio):
// validated with the shared schemas before they reach the api, like the
// watchlist actions. Amounts stay the strings the owner typed, less the
// thousands separators: the api does the arithmetic, in decimals.

const indexPath = "/portfolios";
const detailPath = (id: string) => `/portfolios/${id}` as Route;

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
  revalidatePath(indexPath);
  revalidatePath(detailPath(id));
  return done;
}
