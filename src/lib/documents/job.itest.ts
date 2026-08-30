/**
 * Real end-to-end verification for 3.6: a document row plus a stored PDF, and
 * nothing else, must be enough to index it.
 *
 * Not part of `npm test` -- run deliberately with `npm run test:api`. It costs
 * one Gemini upload, so it uses a single-page file.
 *
 * The point is that `runIndexingJob` takes only an id. If it can index from
 * that alone, then the browser that uploaded the file is genuinely irrelevant:
 * it can be closed, refreshed or navigated away from, and the work still
 * finishes.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { afterAll, describe, expect, it } from "vitest";

import { runIndexingJob } from "@/lib/documents/job";
import { deleteFromStore } from "@/lib/documents/indexer";
import { getDocument } from "@/lib/documents/repo";
import { objectPath, putPdf, removePdf } from "@/lib/documents/storage";
import { createAdminClient } from "@/lib/supabase/admin";

const admin = createAdminClient();
const documentId = randomUUID();
let uploaderId = "";
let storagePath = "";

afterAll(async () => {
    const document = await getDocument(admin, documentId);
    if (document?.gemini_document_name) {
        await deleteFromStore(document.gemini_document_name).catch(() => {});
    }
    if (storagePath) await removePdf(admin, storagePath);
    await admin.from("documents").delete().eq("id", documentId);
});

describe("runIndexingJob", () => {
    it("indexes a document from its id alone", async () => {
        const { data: teacher } = await admin
            .from("profiles")
            .select("id")
            .eq("role", "teacher")
            .limit(1)
            .single();

        expect(
            teacher,
            "no teacher profile to attribute the upload to",
        ).toBeTruthy();
        uploaderId = teacher!.id;
        storagePath = objectPath(uploaderId, documentId);

        const bytes = new Uint8Array(
            readFileSync("doc-to-test/uit-page-1.pdf"),
        );
        const stored = await putPdf(admin, { path: storagePath, bytes });
        expect(stored.ok, "could not store the fixture PDF").toBe(true);

        await admin.from("documents").insert({
            id: documentId,
            title: "UIT (kiểm tra job)",
            file_name: "uit-page-1.pdf",
            file_size: bytes.length,
            uploaded_by: uploaderId,
            status: "pending",
            storage_path: storagePath,
        });

        // Everything the upload request would have held is now gone. This is the
        // whole claim of the phase.
        await runIndexingJob(documentId);

        const document = await getDocument(admin, documentId);
        expect(document?.error_message ?? "").toBe("");
        expect(document?.status).toBe("ready");
        expect(document?.gemini_document_name).toBeTruthy();
    }, 180_000);

    it("refuses to run twice, so two workers cannot both index it", async () => {
        // The row is `ready` by now, so the claim must not match. Without this the
        // sweeper racing an after() job would upload the same PDF twice and the
        // loser would overwrite the winner's result.
        const before = await getDocument(admin, documentId);
        await runIndexingJob(documentId);
        const after = await getDocument(admin, documentId);

        expect(after?.gemini_document_name).toBe(before?.gemini_document_name);
        expect(after?.status).toBe("ready");
    }, 60_000);

    it("fails a document whose stored PDF is missing, rather than hanging", async () => {
        const orphanId = randomUUID();
        await admin.from("documents").insert({
            id: orphanId,
            title: "Không có tệp",
            file_name: "missing.pdf",
            file_size: 1,
            uploaded_by: uploaderId,
            status: "pending",
            storage_path: `${uploaderId}/${orphanId}.pdf`,
        });

        await runIndexingJob(orphanId);

        const document = await getDocument(admin, orphanId);
        // "Stuck at indexing" and "failed with a reason" must not look the same.
        expect(document?.status).toBe("failed");
        expect(document?.error_message).toContain("tệp PDF");

        await admin.from("documents").delete().eq("id", orphanId);
    }, 60_000);
});
