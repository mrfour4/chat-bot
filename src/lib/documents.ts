import "server-only";

import type { DocumentRow } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";

export type PublicDocument = Pick<DocumentRow, "id" | "title" | "created_at">;

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
