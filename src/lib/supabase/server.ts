import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "@/lib/db";
import { requirePublicEnv } from "@/lib/env";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers.
 * Acts as the signed-in user, so RLS is the authorization boundary.
 */
export async function createClient() {
    // Awaited first: touching cookies marks the render dynamic, so a build
    // without secrets present skips this path instead of throwing.
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
                } catch {
                    // Called from a Server Component, where cookies are read-only.
                    // The middleware refreshes the session instead.
                }
            },
        },
    });
}
