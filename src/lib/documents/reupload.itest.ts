import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import { findByChecksum, softDeleteDocument } from "@/lib/documents/repo";
import { createAdminClient } from "@/lib/supabase/admin";

const admin = createAdminClient();
const checksum = `reupload-${randomUUID()}`;
const ids: string[] = [];

async function insert(title: string) {
    const { data, error } = await admin
        .from("documents")
        .insert({
            title,
            file_name: "reupload.pdf",
            file_size: 1024,
            checksum,
            uploaded_by: uploaderId,
            status: "ready",
        })
        .select("id")
        .single();

    if (data) ids.push(data.id);
    return { id: data?.id, error };
}

let uploaderId = "";

afterAll(async () => {
    if (ids.length > 0) await admin.from("documents").delete().in("id", ids);
});

describe("re-uploading the same file", () => {
    it("refuses while a row is live and allows it once deleted", async () => {
        const { data: teacher } = await admin
            .from("profiles")
            .select("id")
            .eq("role", "teacher")
            .limit(1)
            .single();

        expect(teacher, "no teacher profile to upload as").toBeTruthy();
        uploaderId = teacher!.id;

        const first = await insert("Bản gốc");
        expect(first.error).toBeNull();

        const duplicate = await insert("Bản trùng");
        expect(
            duplicate.error?.code,
            "a live checksum accepted a second row",
        ).toBe("23505");

        expect((await findByChecksum(admin, checksum))?.id).toBe(first.id);

        await softDeleteDocument(admin, first.id!, uploaderId);

        expect(
            await findByChecksum(admin, checksum),
            "a deleted row still answers as a duplicate",
        ).toBeNull();

        const again = await insert("Tải lại sau khi xoá");
        expect(
            again.error,
            "a deleted checksum blocked the re-upload",
        ).toBeNull();
    });
});
