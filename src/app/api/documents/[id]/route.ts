import { NextResponse } from "next/server";

import { apiMessages } from "@/lib/api/messages";

import { getSessionUser, getTeacher } from "@/lib/auth";
import { deleteFromStore } from "@/lib/documents/indexer";
import { deleteDocument, getDocument } from "@/lib/documents/repo";
import { removePdf } from "@/lib/documents/storage";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const teacher = await getTeacher();
    if (!teacher) {
        const [user, t] = await Promise.all([getSessionUser(), apiMessages()]);
        return NextResponse.json(
            user
                ? { code: "forbidden", message: t("forbiddenDelete") }
                : { code: "unauthenticated", message: t("unauthenticated") },
            { status: user ? 403 : 401 },
        );
    }

    const { id } = await params;
    const t = await apiMessages();
    const supabase = await createClient();

    // Read through the user's client, so RLS decides visibility. A document
    // belonging to another teacher simply is not here -- and answering 404 rather
    // than 403 avoids confirming that it exists.
    const document = await getDocument(supabase, id);
    if (!document) {
        return NextResponse.json(
            { code: "not-found", message: t("notFound") },
            { status: 404 },
        );
    }

    // Gemini first, then the row. If the row delete fails afterwards, the row
    // survives and can be deleted again -- and the second attempt finds the
    // Gemini document already gone, which counts as success. The reverse order
    // would leave a document in the store that nothing points at and nothing can
    // ever reach.
    //
    // A failed row may carry no gemini_document_name at all, because 2.1.5
    // discards the upload when indexing fails. Nothing to delete is not an error.
    if (document.gemini_document_name) {
        try {
            await deleteFromStore(document.gemini_document_name);
        } catch {
            return NextResponse.json(
                {
                    code: "store-delete-failed",
                    message: t("storeDeleteFailed"),
                },
                { status: 502 },
            );
        }
    }

    // Then the stored PDF, for the same reason and in the same order: an object
    // left behind after the row is gone is unreachable and unnoticeable, while a
    // row left behind can simply be deleted again.
    if (document.storage_path) {
        const removed = await removePdf(supabase, document.storage_path);
        if (!removed.ok) {
            return NextResponse.json(
                {
                    code: "storage-delete-failed",
                    message: t("storageDeleteFailed"),
                },
                { status: 502 },
            );
        }
    }

    await deleteDocument(supabase, id);

    return NextResponse.json({ ok: true });
}
