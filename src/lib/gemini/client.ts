import { GoogleGenAI } from "@google/genai";

import { serverEnv } from "@/lib/env";

let cached: GoogleGenAI | null = null;

export function getGemini(): GoogleGenAI {
    if (!cached) {
        cached = new GoogleGenAI({ apiKey: serverEnv().geminiApiKey });
    }
    return cached;
}

export function getFileSearchStore(): string {
    const store = serverEnv().fileSearchStore;
    if (!store) {
        throw new Error(
            "GEMINI_FILE_SEARCH_STORE is not set. Run `npm run gemini:bootstrap` and " +
                "copy the printed store name into .env.local.",
        );
    }
    return store;
}
