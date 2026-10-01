/*
 * Runs after tsdown. Writes the two stylesheets and checks the one thing an
 * unbundled build can break without an error: "use client" directives.
 *
 * - dist/tokens.css: the generated variables only, for non-Tailwind apps.
 * - dist/styles.css: the Tailwind entry (tailwindcss, the @theme mapping, the
 *   base layer). It stays uncompiled source: the app's Tailwind compiles it
 *   together with the app's own classes, so there is one utility layer. Its
 *   @source lines point at the built JS next to it instead of src/.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const dist = join(root, "dist");

function fail(message: string): never {
  console.error(`postbuild: ${message}`);
  process.exit(1);
}

const tokens = readFileSync(join(src, "tokens/index.css"), "utf8");
writeFileSync(join(dist, "tokens.css"), tokens);

let sourceCount = 0;
const styles = readFileSync(join(src, "styles/index.css"), "utf8")
  .replace('@import "../tokens/index.css";', '@import "./tokens.css";')
  .replace(/@source "\.\.\/(\w+)\/\*\*\/\*\.\{ts,tsx\}";/g, (_, dir: string) => {
    sourceCount += 1;
    return `@source "./${dir}/**/*.js";`;
  });

if (sourceCount === 0 || styles.includes('"../')) {
  fail("styles/index.css changed shape; update the path rewrites in scripts/postbuild.ts.");
}
writeFileSync(join(dist, "styles.css"), styles);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

const isClient = (code: string) => /^\s*["']use client["']/.test(code);
const missing = walk(src)
  .filter((file) => /\.tsx?$/.test(file) && !/\.(test|stories)\.tsx?$/.test(file))
  .filter((file) => isClient(readFileSync(file, "utf8")))
  .map((file) => join(dist, relative(src, file)).replace(/\.tsx?$/, ".js"))
  // Files no entry reaches (story helpers) are not emitted.
  .filter((out) => existsSync(out) && !isClient(readFileSync(out, "utf8")));

if (missing.length > 0) {
  fail(`"use client" was dropped from:\n  ${missing.map((m) => relative(root, m)).join("\n  ")}`);
}

console.log(`postbuild: wrote dist/styles.css and dist/tokens.css; "use client" preserved.`);
