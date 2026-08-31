import { after, NextResponse } from "next/server";

import { apiMessages, uploadMessageKey } from "@/lib/api/messages";

import { getSessionUser, getTeacher } from "@/lib/auth";
import {
    DOCUMENTS_MAX_PAGE_SIZE,
    DOCUMENTS_PAGE_SIZE,
} from "@/constants/documents";
import { sha256Hex } from "@/lib/documents/checksum";
import { runIndexingJob } from "@/lib/documents/job";
import {
    createDocument,
    findByChecksum,
    listDocumentsPage,
    markFailed,
    resetToPending,
    setStoragePath,
} from "@/lib/documents/repo";
import { isDisplayStatus } from "@/lib/documents/status";
import { objectPath, putPdf } from "@/lib/documents/storage";
import { deriveTitle } from "@/lib/documents/title";
import { MAX_UPLOAD_BYTES, validateUpload } from "@/lib/documents/validate";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 90;

const MAX_MEGABYTES = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

function fail(status: number, code: string, message: string) {
    return NextResponse.json({ code, message }, { status });
}

async function denyReason() {
    const [user, t] = await Promise.all([getSessionUser(), apiMessages()]);
    return user
        ? fail(403, "forbidden", t("forbiddenDocuments"))
        : fail(401, "unauthenticated", t("unauthenticated"));
}

function readPositive(value: string | null, fallback: number, max: number) {
    const parsed = Number.parseInt(value ?? "", 10);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return Math.min(parsed, max);
}

export async function GET(request: Request) {
    const teacher = await getTeacher();
    if (!teacher) return denyReason();

    const url = new URL(request.url);
    const status = url.searchParams.get("status");

    const page = readPositive(url.searchParams.get("page"), 0, 10_000);
    const pageSize = Math.max(
        1,
        readPositive(
            url.searchParams.get("pageSize"),
            DOCUMENTS_PAGE_SIZE,
            DOCUMENTS_MAX_PAGE_SIZE,
        ),
    );

    const supabase = await createClient();
    const listing = await listDocumentsPage(supabase, {
        search: url.searchParams.get("q") ?? undefined,
        status: isDisplayStatus(status) ? status : undefined,
        page,
        pageSize,
    });

    return NextResponse.json({ ...listing, page, pageSize });
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

    const existing = await findByChecksum(supabase, checksum);

    if (existing?.archived_at) {
        return NextResponse.json(
            {
                code: "archived-duplicate",
                message: t("archivedDuplicate", { title: existing.title }),
                existing: { id: existing.id, title: existing.title },
            },
            { status: 409 },
        );
    }

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

    const document =
        existing ??
        (await createDocument(supabase, {
            title: deriveTitle(file.name),
            fileName: file.name,
            fileSize: bytes.length,
            checksum,
            uploadedBy: teacher.id,
        }));

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

    if (document.status !== "pending") {
        await resetToPending(supabase, document.id);
    }

    after(() => runIndexingJob(document.id));

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
