import type { GroundingMetadata } from "@google/genai";

import type { Citation } from "@/lib/db";
import { DOCUMENT_ID_KEY } from "@/lib/documents/indexer";

/** Long enough to recognise the passage, short enough to sit under an answer. */
const MAX_SNIPPET = 200;

function trimSnippet(text: string | undefined): string | null {
    const clean = text?.replace(/\s+/g, " ").trim();
    if (!clean) return null;
    if (clean.length <= MAX_SNIPPET) return clean;

    // Cut back to a word boundary: a snippet ending mid-word looks like a bug.
    const cut = clean.slice(0, MAX_SNIPPET);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > MAX_SNIPPET / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Turns Gemini's grounding metadata into the citations we show and store.
 *
 * `documentId` comes from the custom metadata stamped at upload, which is what
 * lets a citation resolve to a real Supabase row rather than just a filename.
 * It is read through `DOCUMENT_ID_KEY` so the write and the read cannot drift
 * apart -- and that key must stay lowercase, per §5.3.
 *
 * Nothing here assumes a field is present. Chunks are external data, and a
 * missing page is better rendered as "no page" than as a confident wrong one.
 */
export function extractCitations(
    metadata: GroundingMetadata | undefined,
): Citation[] {
    const chunks = metadata?.groundingChunks ?? [];

    const byLocation = new Map<string, Citation>();

    for (const chunk of chunks) {
        const context = chunk.retrievedContext;
        if (!context) continue;

        const documentId =
            context.customMetadata?.find(
                (entry) => entry.key === DOCUMENT_ID_KEY,
            )?.stringValue ?? null;

        const fileName = context.title ?? "Tài liệu không rõ tên";
        const page =
            typeof context.pageNumber === "number" ? context.pageNumber : null;

        // Retrieval routinely returns several chunks from one page. Rendering the
        // same page repeatedly under an answer is noise, not provenance -- so one
        // citation per document-and-page, keeping the first snippet.
        const key = `${documentId ?? fileName}#${page ?? "?"}`;
        if (byLocation.has(key)) continue;

        byLocation.set(key, {
            documentId,
            fileName,
            page,
            snippet: trimSnippet(context.text),
        });
    }

    return [...byLocation.values()].sort(
        (a, b) =>
            a.fileName.localeCompare(b.fileName, "vi") ||
            (a.page ?? 0) - (b.page ?? 0),
    );
}
