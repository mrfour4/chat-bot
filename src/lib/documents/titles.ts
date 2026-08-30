import "server-only";

import type { Citation } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";

export async function resolveCitationTitles(
    citations: Citation[],
): Promise<Citation[]> {
    const ids = [
        ...new Set(
            citations
                .map((citation) => citation.documentId)
                .filter((id): id is string => Boolean(id)),
        ),
    ];

    if (ids.length === 0) return citations;

    const { data, error } = await createAdminClient()
        .from("documents")
        .select("id, title")
        .in("id", ids);

    if (error) return citations;

    const titles = new Map((data ?? []).map((row) => [row.id, row.title]));

    return citations.map((citation) => {
        const title = citation.documentId
            ? titles.get(citation.documentId)
            : undefined;
        return title ? { ...citation, fileName: title } : citation;
    });
}
