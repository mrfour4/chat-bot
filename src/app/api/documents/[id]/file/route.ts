import { NextResponse } from "next/server";

import { apiMessages } from "@/lib/api/messages";

import { getSessionUser, getTeacher } from "@/lib/auth";
import { getDocument } from "@/lib/documents/repo";
import { signedUrlFor } from "@/lib/documents/storage";
import { createClient } from "@/lib/supabase/server";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const teacher = await getTeacher();
    if (!teacher) {
        const [user, t] = await Promise.all([getSessionUser(), apiMessages()]);
        return NextResponse.json(
            user
                ? { code: "forbidden", message: t("forbiddenView") }
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
                message: t("noStoredFile"),
            },
            { status: 404 },
        );
    }

    const wantsDownload =
        new URL(request.url).searchParams.get("download") === "1";

    const url = await signedUrlFor(supabase, document.storage_path, {
        ...(wantsDownload ? { download: document.file_name } : {}),
    });

    if (!url) {
        return NextResponse.json(
            {
                code: "sign-failed",
                message: t("signFailed"),
            },
            { status: 502 },
        );
    }

    return NextResponse.redirect(url, {
        status: 302,
        headers: { "cache-control": "no-store" },
    });
}
