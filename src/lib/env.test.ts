import { afterEach, describe, expect, it, vi } from "vitest";

const KEYS = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    "SUPABASE_SECRET_KEY",
    "GEMINI_API_KEY",
    "GEMINI_BASE_URL",
    "GEMINI_FILE_SEARCH_STORE",
] as const;

const original = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));

async function load(values: Partial<Record<(typeof KEYS)[number], string>>) {
    for (const key of KEYS) delete process.env[key];

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test";

    for (const [key, value] of Object.entries(values)) {
        process.env[key] = value;
    }

    vi.resetModules();
    return (await import("@/lib/env")).serverEnv;
}

afterEach(() => {
    for (const key of KEYS) {
        if (original[key] === undefined) delete process.env[key];
        else process.env[key] = original[key];
    }
});

describe("serverEnv", () => {
    it("demands a Gemini key when calls would reach Google", async () => {
        const serverEnv = await load({});
        expect(() => serverEnv()).toThrow(/GEMINI_API_KEY/);
    });

    it("stands in for the key and store when a base URL is set", async () => {
        const serverEnv = await load({
            GEMINI_BASE_URL: "http://127.0.0.1:4010",
        });

        const env = serverEnv();
        expect(env.geminiApiKey).toBe("mock-key");
        expect(env.fileSearchStore).toBe("fileSearchStores/mock");
    });

    it("still prefers real values when they are present", async () => {
        const serverEnv = await load({
            GEMINI_BASE_URL: "http://127.0.0.1:4010",
            GEMINI_API_KEY: "real-key",
            GEMINI_FILE_SEARCH_STORE: "fileSearchStores/real",
        });

        const env = serverEnv();
        expect(env.geminiApiKey).toBe("real-key");
        expect(env.fileSearchStore).toBe("fileSearchStores/real");
    });
});
