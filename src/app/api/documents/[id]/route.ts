import { NextResponse } from "next/server";

import { apiMessages } from "@/lib/api/messages";

import { getSessionUser, getTeacher } from "@/lib/auth";
import { deleteFromStore } from "@/lib/documents/indexer";
import {
    getDocument,
    renameDocument,
    softDeleteDocument,
} from "@/lib/documents/repo";
import { removePdf } from "@/lib/documents/storage";
import { createClient } from "@/lib/supabase/server";
import { renameDocumentSchema } from "@/lib/validation/documents";

async function denyReason(messageKey: "forbiddenDelete" | "forbidden") {
    const [user, t] = await Promise.all([getSessionUser(), apiMessages()]);
    return NextResponse.json(
        user
            ? { code: "forbidden", message: t(messageKey) }
            : { code: "unauthenticated", message: t("unauthenticated") },
        { status: user ? 403 : 401 },
    );
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const teacher = await getTeacher();
    if (!teacher) return denyReason("forbidden");

    const { id } = await params;
    const t = await apiMessages();
    const supabase = await createClient();

    const payload: unknown = await request.json().catch(() => null);
    const parsed = renameDocumentSchema.safeParse(payload);
    if (!parsed.success) {
        return NextResponse.json(
            { code: "invalid-title", message: t("invalidTitle") },
            { status: 400 },
        );
    }

    const document = await getDocument(supabase, id);
    if (!document || document.deleted_at) {
        return NextResponse.json(
            { code: "not-found", message: t("notFound") },
            { status: 404 },
        );
    }

    await renameDocument(supabase, id, {
        title: parsed.data.title,
        actorId: teacher.id,
    });

    return NextResponse.json({
        ...document,
        title: parsed.data.title,
        updated_by: teacher.id,
    });
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const teacher = await getTeacher();
    if (!teacher) return denyReason("forbiddenDelete");

    const { id } = await params;
    const t = await apiMessages();
    const supabase = await createClient();

    const document = await getDocument(supabase, id);
    if (!document || document.deleted_at) {
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

    await softDeleteDocument(supabase, id, teacher.id);

    return NextResponse.json({ ok: true });
}
