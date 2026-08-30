import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/db";
import { requirePublicEnv } from "@/lib/env";

export async function createClient() {
    const cookieStore = await cookies();
    const { supabaseUrl, supabasePublishableKey } = requirePublicEnv();

    return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
        cookies: {
            getAll() {
                return cookieStore.getAll();
            },
            setAll(cookiesToSet) {
                try {
                    for (const { name, value, options } of cookiesToSet) {
                        cookieStore.set(name, value, options);
                    }
                } catch {}
            },
        },
    });
}
