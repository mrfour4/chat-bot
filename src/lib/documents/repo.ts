import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, DocumentRow } from "@/lib/db";

export type DocumentsClient = SupabaseClient<Database>;

export async function listDocuments(
    supabase: DocumentsClient,
): Promise<DocumentRow[]> {
    const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
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

export async function listStale(
    supabase: DocumentsClient,
    staleAfterMs: number,
): Promise<DocumentRow[]> {
    const cutoff = new Date(Date.now() - staleAfterMs).toISOString();

    const { data, error } = await supabase
        .from("documents")
        .select("*")
        .in("status", ["pending", "indexing"])
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

export async function deleteDocument(
    supabase: DocumentsClient,
    id: string,
): Promise<void> {
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) throw error;
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
