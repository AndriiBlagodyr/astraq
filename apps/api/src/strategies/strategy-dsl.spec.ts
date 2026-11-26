import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { StrategyDefinitionSchema } from '@astraq/shared';

// The shared fixtures are the strategy DSL's contract (ADR 0012): the
// Pydantic models generated from this schema run the same file in
// services/ml/tests/test_strategy_contract.py. A document one side accepts
// and the other refuses is a rule that didn't survive JSON Schema.
type Path = (string | number)[];

interface InvalidCase {
  name: string;
  base: string;
  path: Path;
  value?: unknown;
  remove?: true;
}

const fixtures = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../../../packages/shared/fixtures/strategies.json'),
    'utf8',
  ),
) as { valid: Record<string, unknown>; invalid: InvalidCase[] };

/** `document` with the value at `path` replaced, or removed. */
function altered(document: unknown, change: InvalidCase): unknown {
  const result = structuredClone(document);
  let parent = result as Record<string | number, unknown>;
  for (const key of change.path.slice(0, -1)) {
    parent = parent[key] as Record<string | number, unknown>;
  }
  const last = change.path.at(-1)!;
  if (change.remove) delete parent[last];
  else parent[last] = change.value;
  return result;
}

describe('strategy DSL (shared fixtures)', () => {
  it.each(Object.entries(fixtures.valid))('accepts: %s', (_name, document) => {
    // Nothing is defaulted, renamed, or dropped on the way through.
    expect(StrategyDefinitionSchema.parse(document)).toEqual(document);
  });

  it.each(fixtures.invalid)('refuses: $name', (change) => {
    const document = altered(fixtures.valid[change.base], change);
    expect(StrategyDefinitionSchema.safeParse(document).success).toBe(false);
  });
});
