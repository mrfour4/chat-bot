import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, DocumentRow } from "@/lib/db";
import type { DocumentDisplayStatus } from "@/lib/documents/status";

export type DocumentsClient = SupabaseClient<Database>;

export async function listDocuments(
    supabase: DocumentsClient,
): Promise<DocumentRow[]> {
    const { data, error } = await supabase
        .from("documents")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
}

const PERSON_COLUMNS = "id, full_name, email";

const LISTING_SELECT =
    "*, " +
    `uploader:profiles!documents_uploaded_by_fkey(${PERSON_COLUMNS}), ` +
    `editor:profiles!documents_updated_by_fkey(${PERSON_COLUMNS})`;

export type DocumentPerson = {
    id: string;
    full_name: string | null;
    email: string;
};

export type DocumentListItem = DocumentRow & {
    uploader: DocumentPerson | null;
    editor: DocumentPerson | null;
};

export type DocumentListQuery = {
    search?: string;
    status?: DocumentDisplayStatus;
    page: number;
    pageSize: number;
};

export type DocumentListing = {
    documents: DocumentListItem[];
    total: number;
};

// % and _ are ilike wildcards, so an unescaped search for "100%" matches
// every row instead of none.
function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export async function listDocumentsPage(
    supabase: DocumentsClient,
    query: DocumentListQuery,
): Promise<DocumentListing> {
    const from = query.page * query.pageSize;

    let builder = supabase
        .from("documents")
        .select(LISTING_SELECT, { count: "exact" });

    // The six display statuses are derived, not stored (5.3), so each one has
    // to be translated back into the columns that actually hold it. Tombstones
    // are excluded unless they are what was asked for.
    if (query.status === "deleted") {
        builder = builder.not("deleted_at", "is", null);
    } else {
        builder = builder.is("deleted_at", null);

        if (query.status === "archived") {
            builder = builder.not("archived_at", "is", null);
        } else if (query.status) {
            builder = builder
                .is("archived_at", null)
                .eq(
                    "status",
                    query.status === "uploading" ? "pending" : query.status,
                );
        }
    }

    const search = query.search?.trim();
    if (search) {
        builder = builder.ilike("title", `%${escapeLike(search)}%`);
    }

    const { data, error, count } = await builder
        .order("created_at", { ascending: false })
        .range(from, from + query.pageSize - 1);

    if (error) throw error;

    return {
        documents: (data ?? []) as unknown as DocumentListItem[],
        total: count ?? 0,
    };
}

export async function getDocument(
    supabase: DocumentsClient,
    id: string,
): Promise<DocumentRow | null> {
    const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function findByChecksum(
    supabase: DocumentsClient,
    checksum: string,
): Promise<DocumentRow | null> {
    const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("checksum", checksum)
        .is("deleted_at", null)
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function createDocument(
    supabase: DocumentsClient,
    input: {
        title: string;
        fileName: string;
        fileSize: number;
        checksum: string;
        uploadedBy: string;
    },
): Promise<DocumentRow> {
    const { data, error } = await supabase
        .from("documents")
        .insert({
            title: input.title,
            file_name: input.fileName,
            file_size: input.fileSize,
            checksum: input.checksum,
            uploaded_by: input.uploadedBy,
            status: "pending",
        })
        .select("*")
        .single();

    if (error) throw error;
    return data;
}

export async function setStoragePath(
    supabase: DocumentsClient,
    id: string,
    storagePath: string,
): Promise<void> {
    await update(supabase, id, { storage_path: storagePath });
}

export async function markIndexing(
    supabase: DocumentsClient,
    id: string,
): Promise<void> {
    await update(supabase, id, { status: "indexing", error_message: null });
}

export async function claimForIndexing(
    supabase: DocumentsClient,
    id: string,
): Promise<boolean> {
    const { data, error } = await supabase
        .from("documents")
        .update({
            status: "indexing",
            error_message: null,
            updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("status", "pending")
        .select("id");

    if (error) throw error;
    return (data ?? []).length === 1;
}

export async function nextPendingDocument(
    supabase: DocumentsClient,
    skipIds: string[],
): Promise<DocumentRow | null> {
    let builder = supabase
        .from("documents")
        .select("*")
        .eq("status", "pending")
        .is("deleted_at", null)
        .not("storage_path", "is", null);

    if (skipIds.length > 0) {
        builder = builder.not("id", "in", `(${skipIds.join(",")})`);
    }

    const { data, error } = await builder
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error) throw error;
    return data;
}

export async function listStale(
    supabase: DocumentsClient,
    staleAfterMs: number,
): Promise<DocumentRow[]> {
    const cutoff = new Date(Date.now() - staleAfterMs).toISOString();

    const { data, error } = await supabase
        .from("documents")
        .select("*")
        .in("status", ["pending", "indexing"])
        .is("deleted_at", null)
        .is("archived_at", null)
        .not("storage_path", "is", null)
        .lt("updated_at", cutoff);

    if (error) throw error;
    return data ?? [];
}

export async function resetToPending(
    supabase: DocumentsClient,
    id: string,
): Promise<void> {
    await update(supabase, id, { status: "pending", error_message: null });
}

export async function markReady(
    supabase: DocumentsClient,
    id: string,
    geminiDocumentName: string,
): Promise<void> {
    await update(supabase, id, {
        status: "ready",
        gemini_document_name: geminiDocumentName,
        error_message: null,
    });
}

export async function markFailed(
    supabase: DocumentsClient,
    id: string,
    message: string,
): Promise<void> {
    await update(supabase, id, { status: "failed", error_message: message });
}

export async function renameDocument(
    supabase: DocumentsClient,
    id: string,
    input: { title: string; actorId: string },
): Promise<void> {
    await update(supabase, id, {
        title: input.title,
        updated_by: input.actorId,
    });
}

export async function archiveDocument(
    supabase: DocumentsClient,
    id: string,
    actorId: string,
): Promise<void> {
    await update(supabase, id, {
        archived_at: new Date().toISOString(),
        gemini_document_name: null,
        updated_by: actorId,
    });
}

export async function unarchiveDocument(
    supabase: DocumentsClient,
    id: string,
    actorId: string,
): Promise<void> {
    await update(supabase, id, {
        archived_at: null,
        status: "pending",
        error_message: null,
        updated_by: actorId,
    });
}

export async function softDeleteDocument(
    supabase: DocumentsClient,
    id: string,
    actorId: string,
): Promise<void> {
    await update(supabase, id, {
        deleted_at: new Date().toISOString(),
        archived_at: null,
        gemini_document_name: null,
        storage_path: null,
        updated_by: actorId,
    });
}

type DocumentUpdate = Database["public"]["Tables"]["documents"]["Update"];

async function update(
    supabase: DocumentsClient,
    id: string,
    patch: DocumentUpdate,
): Promise<void> {
    const { error } = await supabase
        .from("documents")
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq("id", id);

    if (error) throw error;
}
