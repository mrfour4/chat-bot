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

    const document = await getDocument(supabase, id);
    if (!document) {
        return NextResponse.json(
            { code: "not-found", message: t("notFound") },
            { status: 404 },
        );
    }

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
