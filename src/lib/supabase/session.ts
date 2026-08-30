import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { requirePublicEnv } from "@/lib/env";

/**
 * Refreshes the auth cookie on every request so Server Components always see a
 * valid session. Must not be skipped, or sessions silently expire mid-use.
 */
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
    // Do not remove: this call is what performs the token refresh.
    await supabase.auth.getUser();
  } catch {
    // Never fail the request on a refresh error; the page renders as a guest.
  }

  return response;
}
