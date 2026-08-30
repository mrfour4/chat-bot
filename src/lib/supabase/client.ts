import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/db";
import { requirePublicEnv } from "@/lib/env";

/** Supabase client for Client Components. Uses the anon key; RLS applies. */
export function createClient() {
    const { supabaseUrl, supabasePublishableKey } = requirePublicEnv();
    return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
