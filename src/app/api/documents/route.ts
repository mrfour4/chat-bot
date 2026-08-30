import { after, NextResponse } from "next/server";

import { apiMessages, uploadMessageKey } from "@/lib/api/messages";

import { getSessionUser, getTeacher } from "@/lib/auth";
import { sha256Hex } from "@/lib/documents/checksum";
import { runIndexingJob } from "@/lib/documents/job";
import {
    createDocument,
    findByChecksum,
    listDocuments,
    markFailed,
    resetToPending,
    setStoragePath,
} from "@/lib/documents/repo";
import { objectPath, putPdf } from "@/lib/documents/storage";
import { deriveTitle } from "@/lib/documents/title";
import { MAX_UPLOAD_BYTES, validateUpload } from "@/lib/documents/validate";
import { createClient } from "@/lib/supabase/server";

/**
 * `after()` work counts against the route's duration, and indexing was measured
 * at 10-15s with a 60s cap inside `indexDocument`. Named here so a platform
 * default of 10s does not cut the job off mid-upload to Gemini.
 */
export const maxDuration = 90;

const MAX_MEGABYTES = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

function fail(status: number, code: string, message: string) {
    return NextResponse.json({ code, message }, { status });
}

/**
 * 401 for a guest, 403 for a signed-in non-teacher. The distinction matters:
 * 401 means "log in", 403 means "logging in will not help".
 */
async function denyReason() {
    const [user, t] = await Promise.all([getSessionUser(), apiMessages()]);
    return user
        ? fail(403, "forbidden", t("forbiddenDocuments"))
        : fail(401, "unauthenticated", t("unauthenticated"));
}

export async function GET() {
    const teacher = await getTeacher();
    if (!teacher) return denyReason();

    const supabase = await createClient();
    const documents = await listDocuments(supabase);

    return NextResponse.json({ documents });
}

export async function POST(request: Request) {
    const teacher = await getTeacher();
    if (!teacher) return denyReason();

    const formData = await request.formData();
    const file = formData.get("file");

    const t = await apiMessages();

    if (!(file instanceof File)) {
        return fail(400, "no-file", t("noFileInRequest"));
    }

    // Read once: validation needs the bytes for the signature check and the
    // checksum needs them for dedupe.
    const bytes = new Uint8Array(await file.arrayBuffer());

    const validation = validateUpload({
        fileName: file.name,
        mimeType: file.type,
        bytes,
    });
    if (!validation.ok) {
        return fail(
            400,
            validation.code,
            t(uploadMessageKey(validation.code), { size: MAX_MEGABYTES }),
        );
    }

    const supabase = await createClient();
    const checksum = await sha256Hex(bytes);

    // Dedupe on content, not filename: the same document saved under two names is
    // still the same document, and File Search would index it twice.
    const existing = await findByChecksum(supabase, checksum);

    if (existing && existing.status !== "failed") {
        return NextResponse.json(
            {
                code: "duplicate",
                message: t("duplicate", { title: existing.title }),
                existing: { id: existing.id, title: existing.title },
            },
            { status: 409 },
        );
    }

    // A failed row is re-uploaded rather than duplicated. We deliberately do not
    // keep the PDF bytes (§5.10), so retrying always needs the file again --
    // which makes "upload it again" the whole retry mechanism, and means there is
    // no separate retry endpoint that could drift out of step with this one.
    const document =
        existing ??
        (await createDocument(supabase, {
            title: deriveTitle(file.name),
            fileName: file.name,
            fileSize: bytes.length,
            checksum,
            uploadedBy: teacher.id,
        }));

    // Keep the PDF before indexing it. Storing it is what makes preview, download
    // and -- from 3.6 -- retrying an index possible at all, so a document that
    // indexed but never stored would be a document nobody can ever re-index.
    // Fail closed rather than leave that shape behind.
    const path = objectPath(teacher.id, document.id);
    const stored = await putPdf(supabase, { path, bytes });

    if (!stored.ok) {
        await markFailed(supabase, document.id, stored.message);
        return NextResponse.json(
            { ...document, status: "failed", error_message: stored.message },
            { status: 201 },
        );
    }

    await setStoragePath(supabase, document.id, path);

    // D5 reversed (3.6). Indexing no longer happens inside this request: it takes
    // 10-15s, and a teacher who navigated away, refreshed or closed the tab used
    // to interrupt it. The two things that made synchronous the right call in
    // 2.1.0 have both changed -- 3.3 keeps the PDF, so a worker can re-read it,
    // and `after()` runs work once the response is sent.
    //
    // A reused `failed` row is put back to `pending` so the job can claim it.
    if (document.status !== "pending") {
        await resetToPending(supabase, document.id);
    }

    after(() => runIndexingJob(document.id));

    // 201 now, while the work is still ahead. The row is `pending`, the panel
    // polls, and nothing about the outcome depends on this browser staying open.
    return NextResponse.json(
        {
            ...document,
            status: "pending",
            storage_path: path,
            error_message: null,
        },
        { status: 201 },
    );
}
