import type { GroundingMetadata } from "@google/genai";

import type { Citation } from "@/lib/db";
import { DOCUMENT_ID_KEY } from "@/lib/documents/indexer";

const MAX_SNIPPET = 200;

function trimSnippet(text: string | undefined): string | null {
    const clean = text?.replace(/\s+/g, " ").trim();
    if (!clean) return null;
    if (clean.length <= MAX_SNIPPET) return clean;

    const cut = clean.slice(0, MAX_SNIPPET);
    const lastSpace = cut.lastIndexOf(" ");
    return `${(lastSpace > MAX_SNIPPET / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

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
