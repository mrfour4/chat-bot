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
        supabaseUrl: required(
            "NEXT_PUBLIC_SUPABASE_URL",
            publicEnv.supabaseUrl,
        ),
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
            process.env.SUPABASE_SECRET_KEY ??
                process.env.SUPABASE_SERVICE_ROLE_KEY,
        ),
        geminiApiKey: required("GEMINI_API_KEY", process.env.GEMINI_API_KEY),
        /**
         * Decision D7. `gemini-3.7-flash` is newer but returned 503 for ~75s
         * straight during 2.1.0 while 3.6 answered first try, and Google's own 404
         * for the retired 2.5-flash points at 3.6. Newest is not most available,
         * and a student meeting a dead chatbot does not care which model it was.
         * Overridable so a lower-tier model can absorb testing while quota is short.
         */
        geminiModel: process.env.GEMINI_MODEL || "gemini-3.6-flash",
        /** Empty until the store is bootstrapped — callers must handle that. */
        fileSearchStore: process.env.GEMINI_FILE_SEARCH_STORE ?? "",
    };
}
