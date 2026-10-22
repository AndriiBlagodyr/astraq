export async function register() {
  // Importing the module runs its validation; an invalid env throws here and
  // the server never starts.
  await import("./lib/env");
}
