import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/db";
import { requirePublicEnv } from "@/lib/env";

export function createClient() {
    const { supabaseUrl, supabasePublishableKey } = requirePublicEnv();
    return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
