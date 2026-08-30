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

        await runIndexingJob(documentId);

        const document = await getDocument(admin, documentId);
        expect(document?.error_message ?? "").toBe("");
        expect(document?.status).toBe("ready");
        expect(document?.gemini_document_name).toBeTruthy();
    }, 180_000);

    it("refuses to run twice, so two workers cannot both index it", async () => {
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

        expect(document?.status).toBe("failed");
        expect(document?.error_message).toContain("tệp PDF");

        await admin.from("documents").delete().eq("id", orphanId);
    }, 60_000);
});
