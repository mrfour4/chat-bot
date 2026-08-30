import { NextResponse } from "next/server";

import { serverEnv } from "@/lib/env";
import { getGemini, geminiBaseUrl } from "@/lib/gemini/client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Check = { ok: boolean; detail: string };

export async function GET() {
    const checks: Record<string, Check> = {};

    let env: ReturnType<typeof serverEnv> | null = null;
    try {
        env = serverEnv();
        checks.env = { ok: true, detail: "All required variables are set." };
    } catch (error) {
        checks.env = { ok: false, detail: message(error) };
    }

    try {
        const supabase = await createClient();
        const { error } = await supabase
            .from("documents")
            .select("id")
            .limit(1);

        if (error && error.code !== "42501")
            throw new Error(`${error.code}: ${error.message}`);
        checks.supabase = {
            ok: true,
            detail: "Connected, documents table reachable.",
        };
    } catch (error) {
        checks.supabase = { ok: false, detail: message(error) };
    }

    if (env) {
        try {
            const ai = getGemini();
            const stores: string[] = [];
            for await (const store of await ai.fileSearchStores.list()) {
                if (store.name) stores.push(store.name);
            }
            const baseUrl = geminiBaseUrl();
            checks.gemini = {
                ok: true,
                detail: baseUrl
                    ? `MOCK server at ${baseUrl}. ${stores.length} File Search store(s).`
                    : `API key valid. ${stores.length} File Search store(s).`,
            };
            checks.fileSearchStore = env.fileSearchStore
                ? {
                      ok: stores.includes(env.fileSearchStore),
                      detail: stores.includes(env.fileSearchStore)
                          ? env.fileSearchStore
                          : `${env.fileSearchStore} was not found in this project.`,
                  }
                : {
                      ok: false,
                      detail: "Not configured. Run `npm run gemini:bootstrap`.",
                  };
        } catch (error) {
            checks.gemini = { ok: false, detail: message(error) };
        }
    }

    const ok = Object.values(checks).every((check) => check.ok);
    return NextResponse.json(
        { ok, model: env?.geminiModel ?? null, checks },
        { status: ok ? 200 : 503 },
    );
}

function message(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
