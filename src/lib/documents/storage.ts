import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/db";

export type StorageClient = SupabaseClient<Database>;

export const DOCUMENTS_BUCKET = "documents";

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
