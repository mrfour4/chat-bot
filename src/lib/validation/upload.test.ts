import { describe, expect, it } from "vitest";

import { MAX_UPLOAD_BYTES } from "@/lib/documents/validate";
import { MAX_UPLOAD_FILES, uploadSchema } from "@/lib/validation/upload";

function file(bytes: number, name = "dean.pdf") {
    return new File([new Uint8Array(bytes)], name, {
        type: "application/pdf",
    });
}

describe("uploadSchema", () => {
    it("accepts a plausible PDF", () => {
        expect(uploadSchema.safeParse({ files: [file(1024)] }).success).toBe(
            true,
        );
    });

    it("accepts several at once", () => {
        expect(
            uploadSchema.safeParse({
                files: [file(1024), file(2048, "iuh.pdf")],
            }).success,
        ).toBe(true);
    });

    it("rejects nothing chosen", () => {
        expect(uploadSchema.safeParse({ files: [] }).success).toBe(false);
    });

    it("rejects an empty file", () => {
        expect(uploadSchema.safeParse({ files: [file(0)] }).success).toBe(
            false,
        );
    });

    it("rejects a file past the limit the server also enforces", () => {
        expect(
            uploadSchema.safeParse({ files: [file(MAX_UPLOAD_BYTES + 1)] })
                .success,
        ).toBe(false);
    });

    it("accepts a file exactly at the limit", () => {
        expect(
            uploadSchema.safeParse({ files: [file(MAX_UPLOAD_BYTES)] }).success,
        ).toBe(true);
    });

    it("rejects one bad file among good ones", () => {
        expect(
            uploadSchema.safeParse({
                files: [file(1024), file(0, "empty.pdf")],
            }).success,
        ).toBe(false);
    });

    it("refuses more files than the server will read", () => {
        const files = Array.from({ length: MAX_UPLOAD_FILES + 1 }, (_, i) =>
            file(1024, `doc-${i}.pdf`),
        );
        expect(uploadSchema.safeParse({ files }).success).toBe(false);
    });
});
