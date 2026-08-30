import { NextResponse } from "next/server";

import { apiMessages } from "@/lib/api/messages";

import { getSessionUser, getTeacher } from "@/lib/auth";
import { getDocument } from "@/lib/documents/repo";
import { signedUrlFor } from "@/lib/documents/storage";
import { createClient } from "@/lib/supabase/server";

/**
 * Hands back the stored PDF, as a redirect to a short-lived signed URL.
 *
 * A redirect rather than a stream: proxying up to 20 MB through the route would
 * put the whole file in this process's memory to no purpose, when storage can
 * serve it directly. The signed URL is minted per request and expires in a
 * minute, so nothing durable is handed out.
 *
 * `?download=1` asks storage to send Content-Disposition: attachment under the
 * original filename. Without it the browser renders the PDF inline, which is
 * what the preview wants.
 */
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

    // Through the user's client, so RLS decides. A document belonging to a
    // teacher this one cannot see simply is not here.
    const document = await getDocument(supabase, id);
    if (!document) {
        return NextResponse.json(
            { code: "not-found", message: t("notFound") },
            { status: 404 },
        );
    }

    // Rows created before 3.3 have no object. Saying so is the point: "the file
    // was never kept" and "something is broken" must not look the same.
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

    // 302, not 307: this is a redirect to a different resource, and it must never
    // be cached -- the URL it points at is dead in a minute.
    return NextResponse.redirect(url, {
        status: 302,
        headers: { "cache-control": "no-store" },
    });
}
