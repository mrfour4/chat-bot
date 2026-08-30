import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";
import { requirePublicEnv } from "@/lib/env";

/** Supabase client for Client Components. Uses the anon key; RLS applies. */
export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = requirePublicEnv();
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
