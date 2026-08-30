import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db";
import { serverEnv } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS entirely.
 *
 * Only for work that has no user session to act on behalf of — e.g. writing an
 * indexing result back to a document row from a background job. Never import
 * this from a Client Component, and always check authorization yourself first.
 */
export function createAdminClient() {
    const { supabaseUrl, supabaseSecretKey } = serverEnv();

    return createClient<Database>(supabaseUrl, supabaseSecretKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}
