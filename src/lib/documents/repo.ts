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

export async function markIndexing(
  supabase: DocumentsClient,
  id: string,
): Promise<void> {
  await update(supabase, id, { status: "indexing", error_message: null });
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
