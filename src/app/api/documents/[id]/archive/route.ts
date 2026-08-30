import { after, NextResponse } from "next/server";

import { apiMessages } from "@/lib/api/messages";

import { getSessionUser, getTeacher } from "@/lib/auth";
import { deleteFromStore } from "@/lib/documents/indexer";
import { runIndexingJob } from "@/lib/documents/job";
import {
    archiveDocument,
    getDocument,
    unarchiveDocument,
} from "@/lib/documents/repo";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 90;

async function denyReason() {
    const [user, t] = await Promise.all([getSessionUser(), apiMessages()]);
    return NextResponse.json(
        user
            ? { code: "forbidden", message: t("forbidden") }
            : { code: "unauthenticated", message: t("unauthenticated") },
        { status: user ? 403 : 401 },
    );
}

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const teacher = await getTeacher();
    if (!teacher) return denyReason();

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

    if (document.archived_at) {
        return NextResponse.json({ ...document });
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

    await archiveDocument(supabase, id, teacher.id);

    return NextResponse.json({
        ...document,
        archived_at: new Date().toISOString(),
        gemini_document_name: null,
        updated_by: teacher.id,
    });
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const teacher = await getTeacher();
    if (!teacher) return denyReason();

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

    if (!document.storage_path) {
        return NextResponse.json(
            { code: "no-file", message: t("noStoredFileRetry") },
            { status: 409 },
        );
    }

    await unarchiveDocument(supabase, id, teacher.id);
    after(() => runIndexingJob(id));

    return NextResponse.json({
        ...document,
        archived_at: null,
        status: "pending",
        updated_by: teacher.id,
    });
}
