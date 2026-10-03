import "server-only";

// Every value the app needs is read and checked here and nowhere else. A blank
// value that produces a confusing error three screens later is worse than a
// crash on boot, so this throws rather than falling back to a default.
function required(name: string, value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(`Missing environment variable ${name}. Add it to .env.local and restart.`);
  }

  return value;
}

// Read with literal keys, not a loop over names: Next only inlines a
// NEXT_PUBLIC_ value when it can see the property access statically.
export const env = {
  clerkPublishableKey: required(
    "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  ),
  clerkSecretKey: required("CLERK_SECRET_KEY", process.env.CLERK_SECRET_KEY),
  supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabasePublishableKey: required(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  ),
} as const;
