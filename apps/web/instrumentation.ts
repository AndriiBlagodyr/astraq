export async function register() {
  // Importing the module runs its validation; an invalid env throws here and
  // the server never starts.
  await import("./lib/env");
  // Tracing is Node code (AsyncLocalStorage, undici's diagnostics channel),
  // so the edge runtime never loads it.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startTracing } = await import("./lib/tracing");
    startTracing();
  }
}
