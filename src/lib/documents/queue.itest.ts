import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { afterAll, describe, expect, it } from "vitest";

import { deleteFromStore } from "@/lib/documents/indexer";
import { runIndexingQueue } from "@/lib/documents/queue";
import { getDocument, setStoragePath } from "@/lib/documents/repo";
import { objectPath, putPdf, removePdf } from "@/lib/documents/storage";
import { createAdminClient } from "@/lib/supabase/admin";

const admin = createAdminClient();
const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID()];
const paths: string[] = [];

afterAll(async () => {
    for (const id of ids) {
        const document = await getDocument(admin, id);
        if (document?.gemini_document_name) {
            await deleteFromStore(document.gemini_document_name).catch(
                () => {},
            );
        }
    }
    for (const path of paths) await removePdf(admin, path);
    await admin.from("documents").delete().in("id", ids);
});

describe("runIndexingQueue", () => {
    it("indexes a batch one document at a time", async () => {
        const { data: teacher } = await admin
            .from("profiles")
            .select("id")
            .eq("role", "teacher")
            .limit(1)
            .single();

        expect(teacher, "no teacher profile to upload as").toBeTruthy();
        const uploaderId = teacher!.id;

        const bytes = new Uint8Array(
            readFileSync("doc-to-test/uit-page-1.pdf"),
        );

        for (const [index, id] of ids.entries()) {
            const { error } = await admin.from("documents").insert({
                id,
                title: `Hàng đợi ${index}`,
                file_name: `queue-${index}.pdf`,
                file_size: bytes.length,
                checksum: `queue-${id}`,
                uploaded_by: uploaderId,
                status: "pending",
            });
            expect(error).toBeNull();

            const path = objectPath(uploaderId, id);
            paths.push(path);
            expect((await putPdf(admin, { path, bytes })).ok).toBe(true);
            await setStoragePath(admin, id, path);
        }

        let concurrentPeak = 0;
        const watcher = setInterval(() => {
            void admin
                .from("documents")
                .select("id", { count: "exact", head: true })
                .eq("status", "indexing")
                .in("id", ids)
                .then(({ count }) => {
                    concurrentPeak = Math.max(concurrentPeak, count ?? 0);
                });
        }, 250);

        await Promise.all([runIndexingQueue(), runIndexingQueue()]);
        clearInterval(watcher);

        expect(
            concurrentPeak,
            "two documents were indexed at the same time",
        ).toBeLessThanOrEqual(1);

        for (const id of ids) {
            const document = await getDocument(admin, id);
            expect(
                document?.status,
                `${document?.title} never left the queue`,
            ).not.toBe("pending");
        }
    });
});
