function required(name: string, value: string | undefined): string {
    if (!value) {
        throw new Error(
            `Missing environment variable ${name}. Copy .env.example to .env.local and fill it in.`,
        );
    }
    return value;
}

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

const MOCK_API_KEY = "mock-key";

const MOCK_FILE_SEARCH_STORE = "fileSearchStores/mock";

function mockingGemini(): boolean {
    return Boolean(process.env.GEMINI_BASE_URL);
}

export function serverEnv() {
    const mocking = mockingGemini();

    return {
        ...requirePublicEnv(),
        supabaseSecretKey: required(
            "SUPABASE_SECRET_KEY",
            process.env.SUPABASE_SECRET_KEY ??
                process.env.SUPABASE_SERVICE_ROLE_KEY,
        ),
        geminiApiKey: mocking
            ? (process.env.GEMINI_API_KEY ?? MOCK_API_KEY)
            : required("GEMINI_API_KEY", process.env.GEMINI_API_KEY),

        geminiModel: process.env.GEMINI_MODEL || "gemini-3.6-flash",

        fileSearchStore:
            process.env.GEMINI_FILE_SEARCH_STORE ||
            (mocking ? MOCK_FILE_SEARCH_STORE : ""),
    };
}

export function googleAuthEnabled(): boolean {
    return Boolean(process.env.SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID);
}

export function siteUrl(): string | undefined {
    return process.env.NEXT_PUBLIC_SITE_URL;
}
