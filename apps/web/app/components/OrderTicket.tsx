"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import { PlaceOrderBodySchema, type PlaceOrderBody } from "@astraq/shared";
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  Button,
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerTrigger,
  Feedback,
  FormField,
  Input,
  SegmentedControl,
  SegmentedControlItem,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  useToastManager,
  type ButtonProps,
} from "@astraq/ui";
import { placeOrder, previewOrder } from "@/app/(app)/portfolios/actions";
import type { ActionResult } from "@/lib/action-result";
import { formatMoney, formatPrice } from "@/lib/format";
import type { SymbolSummary } from "@/lib/market-data";
import { fillTiming, placedMessage } from "@/lib/orders";
import { addPendingOrder, removePendingOrder } from "@/lib/pending-orders";
import type { OrderPreview } from "@/lib/portfolios";
import { useSymbolSuggestions } from "@/lib/use-symbol-suggestions";

export type TicketPortfolio = { id: string; name: string };

type OrderTicketProps = {
  /** The portfolios the order can go to; with several the ticket asks which. */
  portfolios: TicketPortfolio[];
  /** The one the ticket starts on; the first when absent. */
  portfolioId?: string;
  /** Opened for one symbol (a stock page, a holdings row): the ticker is fixed. */
  ticker?: string;
  side?: "buy" | "sell";
  /** The trigger's text. */
  children?: ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
};

/**
 * The order ticket (docs/ui-plan.md § Order ticket): a drawer that places a
 * paper order. While it is filled in, the api previews the order: when it
 * fills under the shared fill model, what it is expected to cost, and
 * whether the guards at placement would refuse it, so a refusal shows
 * before the button is pressed.
 *
 * The form mounts when the drawer opens and unmounts when it closes, so
 * every opening starts clean with a new idempotency key.
 */
export function OrderTicket({
  portfolios,
  portfolioId,
  ticker,
  side = "buy",
  children = "Trade",
  variant,
  size,
}: OrderTicketProps) {
  const [open, setOpen] = useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger render={<Button variant={variant} size={size} />}>
        {children}
      </DrawerTrigger>
      <DrawerContent
        title={ticker ? `Paper order · ${ticker}` : "Paper order"}
        description="Simulated: fills follow the shared fill model on daily bars."
      >
        <TicketForm
          portfolios={portfolios}
          initialPortfolioId={portfolioId ?? portfolios[0]?.id ?? ""}
          fixedTicker={ticker}
          initialSide={side}
          onPlaced={() => setOpen(false)}
        />
      </DrawerContent>
    </Drawer>
  );
}

/** A typed number as the api takes it: "1,000.50" and " 1000.5 " are "1000.5". */
const typedNumber = (value: string) => value.replace(/[\s,]/g, "");

const PREVIEW_DELAY_MS = 250;

type PreviewAnswer = { signature: string; result: ActionResult<OrderPreview> };

/**
 * The api's preview of the order as typed, after a short pause. `preview`
 * and `error` belong to this exact order; `loading` means its answer hasn't
 * arrived, and the last one must not be read as its.
 */
function useOrderPreview(portfolioId: string, body: PlaceOrderBody | null) {
  const signature = body ? JSON.stringify([portfolioId, body]) : null;
  const [answer, setAnswer] = useState<PreviewAnswer | null>(null);
  const latest = useRef(0);

  useEffect(() => {
    if (!signature || !body) return;
    const request = ++latest.current;
    const timer = setTimeout(async () => {
      const result = await previewOrder(portfolioId, body).catch(
        (): ActionResult<OrderPreview> => ({
          ok: false,
          error: "The preview didn't answer. The order can still be placed.",
        })
      );
      // A slower, older answer must not overwrite a newer order's.
      if (request === latest.current) setAnswer({ signature, result });
    }, PREVIEW_DELAY_MS);
    return () => clearTimeout(timer);
    // `signature` is the order's content; `body` is a new object each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, portfolioId]);

  const current =
    signature !== null && answer?.signature === signature
      ? answer.result
      : null;
  return {
    preview: current?.ok ? current.value : null,
    error: current && !current.ok ? current.error : null,
    loading: signature !== null && current === null,
  };
}

function TicketForm({
  portfolios,
  initialPortfolioId,
  fixedTicker,
  initialSide,
  onPlaced,
}: {
  portfolios: TicketPortfolio[];
  initialPortfolioId: string;
  fixedTicker?: string;
  initialSide: "buy" | "sell";
  onPlaced: () => void;
}) {
  const toast = useToastManager();
  // Made once per opening: a double submit, or a retry after a dropped
  // connection, reaches the api with the same key and places one order.
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [portfolioId, setPortfolioId] = useState(initialPortfolioId);
  const [ticker, setTicker] = useState(fixedTicker ?? "");
  const [side, setSide] = useState<"buy" | "sell">(initialSide);
  const [type, setType] = useState<"market" | "limit">("market");
  const [quantity, setQuantity] = useState("");
  const [limitPrice, setLimitPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [placing, startTransition] = useTransition();
  const { latest: suggestions, failed: searchFailed } = useSymbolSuggestions(
    fixedTicker ? "" : ticker
  );

  // The order as the api would take it, or the first thing wrong with it.
  const parsed = useMemo(
    () =>
      PlaceOrderBodySchema.safeParse({
        ticker: ticker.trim().toUpperCase(),
        side,
        type,
        quantity: typedNumber(quantity),
        limitPrice: type === "limit" ? typedNumber(limitPrice) : undefined,
      }),
    [ticker, side, type, quantity, limitPrice]
  );
  const body = parsed.success ? parsed.data : null;
  const {
    preview,
    error: previewError,
    loading,
  } = useOrderPreview(portfolioId, body);
  const refusal = preview?.refusal ?? null;

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!body) {
      setError(
        parsed.error?.issues[0]?.message ?? "The order isn't complete yet"
      );
      return;
    }
    setError(null);
    addPendingOrder({
      key: idempotencyKey,
      portfolioId,
      ticker: body.ticker,
      side: body.side,
      type: body.type,
      quantity: body.quantity,
      limitPrice: body.limitPrice ?? null,
    });
    startTransition(async () => {
      const result = await placeOrder(portfolioId, idempotencyKey, body).catch(
        () => null
      );
      // Placed or not, the row that stood in for it goes: on success the
      // server's list arrives with the real order in the same response.
      removePendingOrder(idempotencyKey);
      if (!result?.ok) {
        const message =
          result?.error ??
          "The server didn't answer. Placing it again is safe: the same order is never placed twice.";
        setError(message);
        toast.add({ title: message, type: "danger", priority: "high" });
        return;
      }
      const { type: tone, ...message } = placedMessage(result.value);
      toast.add({
        ...message,
        type: tone,
        priority: tone === "danger" ? "high" : undefined,
      });
      onPlaced();
    });
  }

  const cashLabel = side === "buy" ? "Estimated cost" : "Estimated proceeds";

  return (
    <form onSubmit={submit} className="flex flex-1 flex-col gap-5" noValidate>
      {portfolios.length > 1 ? (
        <FormField label="Portfolio">
          <Select
            items={portfolios.map(({ id, name }) => ({
              value: id,
              label: name,
            }))}
            value={portfolioId}
            onValueChange={(value) => {
              if (value) setPortfolioId(value);
            }}
          >
            <SelectTrigger />
            <SelectContent>
              {portfolios.map(({ id, name }) => (
                <SelectItem key={id} value={id}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      ) : null}

      {fixedTicker ? null : (
        <FormField label="Symbol">
          <Autocomplete
            items={suggestions}
            value={ticker}
            onValueChange={setTicker}
            itemToStringValue={(symbol: SymbolSummary) => symbol.ticker}
            // The server already filtered by ticker and name.
            mode="none"
          >
            <AutocompleteInput
              placeholder="NVDA, Apple…"
              autoComplete="off"
              spellCheck={false}
            />
            <AutocompleteContent>
              <AutocompleteEmpty>
                {!ticker.trim()
                  ? "Type a ticker or company name."
                  : searchFailed
                    ? "Symbol search isn’t answering. An exact ticker still works."
                    : "No loaded symbol matches. An exact ticker still works."}
              </AutocompleteEmpty>
              <AutocompleteList>
                {(symbol: SymbolSummary) => (
                  <AutocompleteItem key={symbol.ticker} value={symbol}>
                    <span className="font-semibold text-foreground">
                      {symbol.ticker}
                    </span>
                    <span className="ml-2 truncate text-muted">
                      {symbol.name}
                    </span>
                  </AutocompleteItem>
                )}
              </AutocompleteList>
            </AutocompleteContent>
          </Autocomplete>
        </FormField>
      )}

      <SegmentedControl
        aria-label="Side"
        value={side}
        onValueChange={(value) => setSide(value === "sell" ? "sell" : "buy")}
      >
        <SegmentedControlItem value="buy">Buy</SegmentedControlItem>
        <SegmentedControlItem value="sell">Sell</SegmentedControlItem>
      </SegmentedControl>

      <SegmentedControl
        aria-label="Order type"
        value={type}
        onValueChange={(value) =>
          setType(value === "limit" ? "limit" : "market")
        }
      >
        <SegmentedControlItem value="market">Market</SegmentedControlItem>
        <SegmentedControlItem value="limit">Limit</SegmentedControlItem>
      </SegmentedControl>

      <FormField label="Shares" description="Fractions down to a millionth.">
        <Input
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          inputMode="decimal"
          placeholder="10"
          autoComplete="off"
        />
      </FormField>

      {type === "limit" ? (
        <FormField
          label="Limit price"
          description={
            side === "buy"
              ? "The most you would pay per share."
              : "The least you would take per share."
          }
        >
          <Input
            value={limitPrice}
            onChange={(event) => setLimitPrice(event.target.value)}
            inputMode="decimal"
            placeholder="150.00"
            autoComplete="off"
          />
        </FormField>
      ) : null}

      {/* The preview: polite, so a screen reader hears the estimate settle. */}
      <div aria-live="polite" className="grid gap-3">
        {preview ? (
          <>
            <p className="m-0 text-sm font-semibold text-foreground">
              {fillTiming(preview, type)}
            </p>
            <dl className="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-sm tabular-nums">
              <dt className="text-muted">Estimated price</dt>
              <dd className="m-0 text-right">
                {preview.estimatedPrice === null
                  ? "No price yet"
                  : formatPrice(preview.estimatedPrice)}
              </dd>
              <dt className="text-muted">{cashLabel}</dt>
              <dd className="m-0 text-right">
                {preview.notional === null
                  ? "—"
                  : formatMoney(preview.notional)}
              </dd>
              <dt className="text-muted">Commission</dt>
              <dd className="m-0 text-right">
                {preview.commission === null
                  ? "—"
                  : formatMoney(preview.commission)}
              </dd>
              <dt className="text-muted">Cash after</dt>
              <dd className="m-0 text-right">
                {preview.cashAfter === null
                  ? "—"
                  : formatMoney(preview.cashAfter)}
              </dd>
            </dl>
            <p className="m-0 text-xs leading-5 text-muted">
              An estimate
              {type === "market" ? " at the latest close" : " at your limit"}:
              the fill may differ, and is checked again when it happens.
            </p>
            {refusal ? (
              <Feedback
                tone="danger"
                title="This order would be refused"
                description={refusal.message}
              />
            ) : null}
          </>
        ) : body ? (
          <p className="m-0 text-sm text-muted">
            {loading ? "Checking the order…" : previewError}
          </p>
        ) : (
          <p className="m-0 text-sm text-muted">
            Enter {fixedTicker ? "" : "a symbol and "}a number of shares to see
            what the order would cost and when it would fill.
          </p>
        )}
      </div>

      {error ? (
        <p role="alert" className="m-0 text-sm font-medium text-negative-fg">
          {error}
        </p>
      ) : null}

      <DrawerFooter>
        <DrawerClose render={<Button type="button" variant="secondary" />}>
          Close
        </DrawerClose>
        <Button type="submit" loading={placing} disabled={refusal !== null}>
          {side === "buy" ? "Place buy order" : "Place sell order"}
        </Button>
      </DrawerFooter>
    </form>
  );
}
