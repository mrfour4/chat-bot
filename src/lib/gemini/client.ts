import { GoogleGenAI } from "@google/genai";

import { serverEnv } from "@/lib/env";

let cached: GoogleGenAI | null = null;

/**
 * Server-only Gemini client. The API key is read from the server environment
 * and never reaches the browser — every Gemini call goes through a route
 * handler or server action in this app.
 */
export function getGemini(): GoogleGenAI {
    if (!cached) {
        cached = new GoogleGenAI({ apiKey: serverEnv().geminiApiKey });
    }
    return cached;
}

/** Resource name of the File Search store holding the admissions PDFs. */
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
