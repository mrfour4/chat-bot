import "server-only";

import type { DocumentRow } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicDocument = Pick<DocumentRow, "id" | "title" | "created_at">;

/**
 * The indexed documents, for the public "what can I ask about" list.
 *
 * Read with the service-role client and narrowed to non-sensitive columns, so
 * guests learn what the assistant knows without documents becoming readable.
 * Returns an empty list if the environment is not configured yet.
 */
export async function listIndexedDocuments(): Promise<PublicDocument[]> {
    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from("documents")
            .select("id, title, created_at")
            .eq("status", "ready")
            .order("created_at", { ascending: false });

        if (error) throw error;
        return data ?? [];
    } catch {
        return [];
    }
}
