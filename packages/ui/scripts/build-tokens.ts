/**
 * Builds token outputs from the typed theme sources.
 *
 *   pnpm --filter @astraq/ui tokens         write the files
 *   pnpm --filter @astraq/ui tokens:check   fail if committed files are stale
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { emitCss, emitJson, emitRegistry } from "../src/tokens/emit";
import { resolveTheme } from "../src/tokens/resolve";
import { THEME_SOURCES } from "../src/tokens/themes";

const tokensDir = resolve(dirname(fileURLToPath(import.meta.url)), "../src/tokens");
const themes = THEME_SOURCES.map(resolveTheme);

const outputs: Record<string, string> = {
  "index.css": emitCss(themes),
  "generated/tokens.json": emitJson(themes),
  "generated/registry.ts": emitRegistry(themes),
};

const check = process.argv.includes("--check");
const stale: string[] = [];

for (const [file, content] of Object.entries(outputs)) {
  const path = resolve(tokensDir, file);
  const shown = relative(process.cwd(), path);

  if (check) {
    let current = "";
    try {
      current = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
    } catch {
      // Missing counts as stale.
    }
    if (current !== content) stale.push(shown);
    continue;
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  console.log(`wrote ${shown}`);
}

if (stale.length > 0) {
  console.error(
    `Token outputs are out of date:\n  ${stale.join("\n  ")}\nRun \`pnpm --filter @astraq/ui tokens\` and commit the result.`,
  );
  process.exit(1);
}
if (check) console.log("Token outputs are up to date.");
