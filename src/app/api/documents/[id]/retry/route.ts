import { after, NextResponse } from "next/server";

import { apiMessages } from "@/lib/api/messages";

import { getSessionUser, getTeacher } from "@/lib/auth";
import { runIndexingJob } from "@/lib/documents/job";
import { getDocument, resetToPending } from "@/lib/documents/repo";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 90;

export async function POST(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const teacher = await getTeacher();
    if (!teacher) {
        const [user, t] = await Promise.all([getSessionUser(), apiMessages()]);
        return NextResponse.json(
            user
                ? { code: "forbidden", message: t("forbidden") }
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

    if (!document.storage_path) {
        return NextResponse.json(
            {
                code: "no-file",
                message: t("noStoredFileRetry"),
            },
            { status: 409 },
        );
    }

    await resetToPending(supabase, id);
    after(() => runIndexingJob(id));

    return NextResponse.json({ ...document, status: "pending" });
}
