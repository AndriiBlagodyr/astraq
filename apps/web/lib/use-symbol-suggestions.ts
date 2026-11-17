"use client";

import { useEffect, useRef, useState } from "react";
import { suggestSymbols } from "@/app/(app)/actions";
import type { SymbolSummary } from "./market-data";

const SUGGEST_DELAY_MS = 150;

type Answer = { query: string; symbols: SymbolSummary[]; failed: boolean };

const NO_ANSWER: Answer = { query: "", symbols: [], failed: false };

/**
 * Symbol suggestions for a search box: the api's search through a server
 * action, after a short pause, for the command palette and the watchlist's
 * add-symbol box.
 *
 * - `symbols`: the answer to this exact query, empty until it arrives.
 * - `latest`: the last answer received, to keep a list on screen while the
 *   next one loads.
 * - `searching`: no answer for this query yet.
 * - `failed`: the search for this query didn't answer. That is not "nothing
 *   matches", and the box should say so.
 */
export function useSymbolSuggestions(query: string) {
  const trimmed = query.trim();
  const [answer, setAnswer] = useState<Answer>(NO_ANSWER);
  const latest = useRef(0);

  useEffect(() => {
    if (!trimmed) return;
    const request = ++latest.current;
    const timer = setTimeout(async () => {
      // A rejected action (the network dropped) is a failed search too.
      const result = await suggestSymbols(trimmed).catch(() => null);
      // A slower, older answer must not overwrite a newer query's.
      if (request !== latest.current) return;
      setAnswer({
        query: trimmed,
        symbols: result?.ok ? result.value : [],
        failed: !result?.ok,
      });
    }, SUGGEST_DELAY_MS);
    return () => clearTimeout(timer);
  }, [trimmed]);

  const current = trimmed !== "" && answer.query === trimmed;
  return {
    symbols: current ? answer.symbols : [],
    latest: trimmed ? answer.symbols : [],
    searching: trimmed !== "" && !current,
    failed: current && answer.failed,
  };
}
