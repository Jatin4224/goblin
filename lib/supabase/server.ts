import "server-only";

import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

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

  return createClient(env.supabaseUrl, env.supabasePublishableKey, {
    accessToken: () => getToken(),
  });
}
