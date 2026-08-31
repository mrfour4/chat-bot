import { after, NextResponse } from "next/server";

import { apiMessages, uploadMessageKey } from "@/lib/api/messages";

import {
    DOCUMENTS_MAX_PAGE_SIZE,
    DOCUMENTS_PAGE_SIZE,
} from "@/constants/documents";
import { getSessionUser, getTeacher } from "@/lib/auth";
import { sha256Hex } from "@/lib/documents/checksum";
import { runIndexingQueue } from "@/lib/documents/queue";
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
import type { DocumentRow } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 300;

const MAX_MEGABYTES = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

export type UploadOutcome = "queued" | "duplicate" | "rejected";

export type UploadResult = {
    fileName: string;
    outcome: UploadOutcome;
    message?: string;
    document?: DocumentRow;
};

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

    const t = await apiMessages();
    const formData = await request.formData();

    const files = formData
        .getAll("file")
        .filter((entry): entry is File => entry instanceof File);

    if (files.length === 0) {
        return fail(400, "no-file", t("noFileInRequest"));
    }

    const supabase = await createClient();

    const results: UploadResult[] = [];
    for (const file of files) {
        results.push(await store(supabase, teacher.id, file, t));
    }

    if (results.some((result) => result.outcome === "queued")) {
        after(() => runIndexingQueue());
    }

    return NextResponse.json({ results }, { status: 201 });
}

async function store(
    supabase: Awaited<ReturnType<typeof createClient>>,
    teacherId: string,
    file: File,
    t: Awaited<ReturnType<typeof apiMessages>>,
): Promise<UploadResult> {
    const bytes = new Uint8Array(await file.arrayBuffer());

    const validation = validateUpload({
        fileName: file.name,
        mimeType: file.type,
        bytes,
    });
    if (!validation.ok) {
        return {
            fileName: file.name,
            outcome: "rejected",
            message: t(uploadMessageKey(validation.code), {
                size: MAX_MEGABYTES,
            }),
        };
    }

    const checksum = await sha256Hex(bytes);
    const existing = await findByChecksum(supabase, checksum);

    if (existing?.archived_at) {
        return {
            fileName: file.name,
            outcome: "duplicate",
            message: t("archivedDuplicate", { title: existing.title }),
        };
    }

    if (existing && existing.status !== "failed") {
        return {
            fileName: file.name,
            outcome: "duplicate",
            message: t("duplicate", { title: existing.title }),
        };
    }

    const document =
        existing ??
        (await createDocument(supabase, {
            title: deriveTitle(file.name),
            fileName: file.name,
            fileSize: bytes.length,
            checksum,
            uploadedBy: teacherId,
        }));

    const path = objectPath(teacherId, document.id);
    const stored = await putPdf(supabase, { path, bytes });

    if (!stored.ok) {
        await markFailed(supabase, document.id, stored.message);
        return {
            fileName: file.name,
            outcome: "rejected",
            message: stored.message,
        };
    }

    await setStoragePath(supabase, document.id, path);

    if (document.status !== "pending") {
        await resetToPending(supabase, document.id);
    }

    return {
        fileName: file.name,
        outcome: "queued",
        document: {
            ...document,
            status: "pending",
            storage_path: path,
            error_message: null,
        },
    };
}
