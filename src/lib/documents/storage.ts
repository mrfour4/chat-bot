import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db";

/**
 * The uploaded PDF itself.
 *
 * §5.10 threw these bytes away deliberately, which is exactly why indexing had
 * to happen inside the upload request -- the file existed nowhere else. Keeping
 * it serves preview and download, and is what lets 3.6 move indexing off the
 * request entirely: a worker can only re-read what we kept.
 *
 * The client is injected for the same reason as `repo.ts`: a teacher's upload
 * must go through the *user's* client so the storage policies apply, and a
 * module that reached for the secret key on its own would quietly turn the
 * authorization boundary off.
 */
export type StorageClient = SupabaseClient<Database>;

export const DOCUMENTS_BUCKET = "documents";

/**
 * `<uploader_id>/<document_id>.pdf`.
 *
 * The first segment is load-bearing: the storage policies read ownership out of
 * the path rather than out of storage's `owner` column, so the rule stays
 * legible in the policy and does not depend on which client wrote the object.
 * The document id makes it unique and makes a re-upload overwrite its own
 * object rather than accumulate a second one.
 */
export function objectPath(uploaderId: string, documentId: string): string {
    return `${uploaderId}/${documentId}.pdf`;
}

export type StorageOutcome = { ok: true } | { ok: false; message: string };

export async function putPdf(
    supabase: StorageClient,
    input: { path: string; bytes: Uint8Array },
): Promise<StorageOutcome> {
    const { error } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .upload(input.path, input.bytes, {
            contentType: "application/pdf",
            // Re-uploading a failed document reuses its row, and therefore its path.
            // Without this the second attempt collides with the first attempt's
            // object and the retry fails for a reason that has nothing to do with
            // the retry.
            upsert: true,
        });

    if (error) {
        return {
            ok: false,
            message:
                "Không lưu được tệp PDF. Vui lòng thử lại. " +
                `(Chi tiết: ${error.message})`,
        };
    }

    return { ok: true };
}

/**
 * Reads a stored PDF back.
 *
 * This is what makes indexing re-drivable: the worker does not need the request
 * that uploaded the file, only the object it left behind.
 */
export async function getPdf(
    supabase: StorageClient,
    path: string,
): Promise<Uint8Array | null> {
    const { data, error } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .download(path);

    if (error || !data) return null;
    return new Uint8Array(await data.arrayBuffer());
}

/** Treats "already gone" as success, so a repeated delete can self-heal. */
export async function removePdf(
    supabase: StorageClient,
    path: string,
): Promise<StorageOutcome> {
    const { error } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .remove([path]);

    if (error) return { ok: false, message: error.message };
    return { ok: true };
}

/**
 * A short-lived URL for one object.
 *
 * Short by design: the URL is a bearer token in a query string, so it will end
 * up in history and in logs. Sixty seconds is long enough to open the viewer
 * and far too short to be worth passing on.
 */
export const SIGNED_URL_TTL_SECONDS = 60;

export async function signedUrlFor(
    supabase: StorageClient,
    path: string,
    options: { download?: string } = {},
): Promise<string | null> {
    const { data, error } = await supabase.storage
        .from(DOCUMENTS_BUCKET)
        .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, options);

    if (error || !data) return null;
    return data.signedUrl;
}
