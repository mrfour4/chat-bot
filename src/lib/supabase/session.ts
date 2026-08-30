import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { requirePublicEnv } from "@/lib/env";

export async function updateSession(request: NextRequest) {
    let response = NextResponse.next({ request });

    const { supabaseUrl, supabasePublishableKey } = requirePublicEnv();

    const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                for (const { name, value } of cookiesToSet) {
                    request.cookies.set(name, value);
                }
                response = NextResponse.next({ request });
                for (const { name, value, options } of cookiesToSet) {
                    response.cookies.set(name, value, options);
                }
            },
        },
    });

    try {
        await supabase.auth.getUser();
    } catch {}

    return response;
}
