/**
 * Creates the Gemini File Search store this app indexes admissions PDFs into,
 * and prints the resource name to paste into GEMINI_FILE_SEARCH_STORE.
 *
 *   npm run gemini:bootstrap
 *
 * Safe to re-run: if a store with the same display name already exists it is
 * reported instead of creating a duplicate.
 */
import { GoogleGenAI } from "@google/genai";

const DISPLAY_NAME =
    process.env.GEMINI_FILE_SEARCH_STORE_NAME ?? "admissions-documents";

async function main() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("GEMINI_API_KEY is not set. Fill in .env.local first.");
        process.exit(1);
    }

    const ai = new GoogleGenAI({ apiKey });

    for await (const store of await ai.fileSearchStores.list()) {
        if (store.displayName === DISPLAY_NAME) {
            console.log(`Store "${DISPLAY_NAME}" already exists.\n`);
            console.log(`GEMINI_FILE_SEARCH_STORE=${store.name}`);
            return;
        }
    }

    const store = await ai.fileSearchStores.create({
        config: { displayName: DISPLAY_NAME },
    });

    console.log(`Created File Search store "${DISPLAY_NAME}".\n`);
    console.log("Add this line to .env.local:\n");
    console.log(`GEMINI_FILE_SEARCH_STORE=${store.name}`);
}

main().catch((error) => {
    console.error("Failed to bootstrap File Search store:");
    console.error(error);
    process.exit(1);
});
