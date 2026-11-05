"use client";

import { useTransition } from "react";
import { ChevronDown, Star } from "lucide-react";
import {
  Button,
  Menu,
  MenuContent,
  MenuItem,
  MenuLinkItem,
  MenuSeparator,
  MenuTrigger,
  useToastManager,
} from "@astraq/ui";
import { addSymbol } from "@/app/(app)/watchlists/actions";
import type { WatchlistSummary } from "@/lib/watchlists";

/**
 * The stock page header's "Add to watchlist" (docs/ui-plan.md § Stock
 * page, Phase 2): one item per list, and a link to make the first one.
 */
export function AddToWatchlistMenu({
  ticker,
  watchlists,
}: {
  ticker: string;
  watchlists: Pick<WatchlistSummary, "id" | "name">[];
}) {
  const toast = useToastManager();
  const [pending, startTransition] = useTransition();

  function add(list: Pick<WatchlistSummary, "id" | "name">) {
    startTransition(async () => {
      const result = await addSymbol(list.id, ticker);
      if (result.ok) {
        toast.add({
          title: `Added ${ticker} to ${list.name}`,
          type: "success",
        });
      } else {
        toast.add({ title: result.error, type: "danger", priority: "high" });
      }
    });
  }

  return (
    <Menu>
      <MenuTrigger
        render={<Button variant="secondary" size="sm" loading={pending} />}
      >
        <Star aria-hidden="true" />
        Add to watchlist
        <ChevronDown aria-hidden="true" />
      </MenuTrigger>
      <MenuContent align="end">
        {watchlists.map((list) => (
          <MenuItem key={list.id} onClick={() => add(list)}>
            {list.name}
          </MenuItem>
        ))}
        {watchlists.length > 0 ? <MenuSeparator /> : null}
        <MenuLinkItem href="/watchlists">
          {watchlists.length > 0 ? "Manage watchlists" : "Create a watchlist"}
        </MenuLinkItem>
      </MenuContent>
    </Menu>
  );
}
