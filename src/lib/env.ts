/**
 * Environment access.
 *
 * `publicEnv` is inlined into the browser bundle; `serverEnv()` must only ever
 * be called from server code. Both fail loudly at first use rather than
 * silently producing an unauthenticated client.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
    );
  }
  return value;
}

/**
 * Supabase renamed its keys: `publishable` / `secret` replace `anon` /
 * `service_role`. Both spellings are accepted so either generation of project
 * settings works. NEXT_PUBLIC_* must be referenced literally to be inlined.
 */
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabasePublishableKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "",
};

export function requirePublicEnv() {
  return {
    supabaseUrl: required("NEXT_PUBLIC_SUPABASE_URL", publicEnv.supabaseUrl),
    supabasePublishableKey: required(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      publicEnv.supabasePublishableKey,
    ),
  };
}

export function serverEnv() {
  return {
    ...requirePublicEnv(),
    supabaseSecretKey: required(
      "SUPABASE_SECRET_KEY",
      process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY,
    ),
    geminiApiKey: required("GEMINI_API_KEY", process.env.GEMINI_API_KEY),
    geminiModel: process.env.GEMINI_MODEL || "gemini-3.7-flash",
    /** Empty until the store is bootstrapped — callers must handle that. */
    fileSearchStore: process.env.GEMINI_FILE_SEARCH_STORE ?? "",
  };
}
