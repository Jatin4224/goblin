// Importing the environment here is what makes a missing value a crash on boot
// instead of a failure on whichever page happens to need it first.
export async function register() {
  await import("./lib/env");
}
