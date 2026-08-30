import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db";
import { serverEnv } from "@/lib/env";

export function createAdminClient() {
    const { supabaseUrl, supabaseSecretKey } = serverEnv();

    return createClient<Database>(supabaseUrl, supabaseSecretKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}
