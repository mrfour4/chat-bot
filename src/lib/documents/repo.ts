import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, DocumentRow } from "@/lib/db";

/**
 * Data access for `documents`.
 *
 * Every function takes its client as an argument rather than creating one. A
 * teacher listing documents must go through the *user's* client so RLS applies
 * (§5.4); a write-back after indexing has no session and must use the
 * secret-key client. A module that picked its own would have to pick one of
 * those and be wrong half the time — most likely by reaching for the secret key
 * everywhere, which quietly turns the authorization boundary off.
 *
 * It also keeps `server-only` out of this file, so it stays importable from
 * tests.
 */
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

/**
 * Moves a document from `pending` to `indexing`, and reports whether *this*
 * caller is the one that moved it.
 *
 * The `.eq("status", "pending")` is the whole point: it makes the transition a
 * claim rather than an assignment. Two workers can race the same document --
 * an `after()` job and the sweeper -- and exactly one will match a row. Without
 * it both would upload the same PDF to Gemini and the loser would overwrite the
 * winner's result with its own.
 */
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

/**
 * Documents left mid-flight for longer than `staleAfterMs`.
 *
 * Staleness is measured on `updated_at`, not on the status alone, so a healthy
 * index that is simply still running is never disturbed. Rows without a stored
 * PDF are excluded: there is nothing to re-read, so re-driving them would only
 * fail again.
 */
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

/** Puts a document back in the queue -- the retry path, and the sweeper's. */
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
