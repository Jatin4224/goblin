import "server-only";

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/database.types";

// Clerk owns the session. Supabase only verifies the token it is handed, which
// is why there is no cookie handling and no session refresh here: two things
// owning the same cookie is what produces random sign-outs.
//
// The accessToken callback is the whole point. It is what puts the
// organization claim in front of a policy later. A client constructed without
// it reads as anonymous, which looks completely fine until the first policy
// exists and then returns nothing.
export async function supabaseForRequest() {
  const { getToken } = await auth();

  // Typed off the generated schema, so a query naming a column that isn't
  // there fails the build rather than coming back empty.
  return createClient<Database>(env.supabaseUrl, env.supabasePublishableKey, {
    accessToken: () => getToken(),
  });
}
