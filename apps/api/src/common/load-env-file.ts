// Reads `apps/api/.env.local` into the environment for the dev server.
// Imported for its side effect, first thing in env.ts, so the file is in
// place before the schema reads `process.env`.
//
// The CLIs get the same file from node's `--env-file-if-exists` flag (their
// package.json scripts). `nest start --watch` can't be given that flag
// without `--exec`, which on Windows breaks the restart after a file
// change, so the dev server loads the file here instead.
//
// Not in production, where variables come from the host, and not under
// Vitest, where a developer's local file mustn't change what a test sees.
// A variable that is already set wins, as with the flag.
if (process.env.NODE_ENV !== 'production' && !process.env.VITEST) {
  try {
    process.loadEnvFile('.env.local');
  } catch {
    // No file: every variable has a local default (local-defaults.ts).
  }
}
