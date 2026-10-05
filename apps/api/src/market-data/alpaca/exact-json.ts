// `JSON.parse` turns 123.45 into a binary float before any code sees it, and
// prices must never be floats. The reviver's third argument (JSON.parse
// source text access, Node 21+) carries the number exactly as the provider
// wrote it, so every JSON number comes out as its source string instead.

type ReviverContext = { source?: string };

function keepNumberSource(
  _key: string,
  value: unknown,
  context?: ReviverContext,
): unknown {
  if (typeof value !== 'number') return value;
  if (context?.source === undefined) {
    throw new Error('JSON.parse source text access is unavailable (Node 21+)');
  }
  return context.source;
}

/** Parses JSON, returning every number as its exact source text. */
export function parseJsonExact(text: string): unknown {
  return JSON.parse(
    text,
    keepNumberSource as Parameters<typeof JSON.parse>[1],
  ) as unknown;
}
