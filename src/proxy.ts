import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/session";

/** Runs before every matched request; keeps the Supabase session fresh. */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image files — those never need a
     * session refresh and the cost adds up.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
