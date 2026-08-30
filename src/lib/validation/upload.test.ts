import { describe, expect, it } from "vitest";

import { MAX_UPLOAD_BYTES } from "@/lib/documents/validate";
import { uploadSchema } from "@/lib/validation/upload";

function file(bytes: number, name = "dean.pdf") {
    return new File([new Uint8Array(bytes)], name, {
        type: "application/pdf",
    });
}

describe("uploadSchema", () => {
    it("accepts a plausible PDF", () => {
        expect(uploadSchema.safeParse({ file: file(1024) }).success).toBe(true);
    });

    it("rejects nothing chosen", () => {
        expect(uploadSchema.safeParse({ file: null }).success).toBe(false);
    });

    it("rejects an empty file", () => {
        expect(uploadSchema.safeParse({ file: file(0) }).success).toBe(false);
    });

    it("rejects a file past the limit the server also enforces", () => {
        expect(
            uploadSchema.safeParse({ file: file(MAX_UPLOAD_BYTES + 1) })
                .success,
        ).toBe(false);
    });

    it("accepts a file exactly at the limit", () => {
        expect(
            uploadSchema.safeParse({ file: file(MAX_UPLOAD_BYTES) }).success,
        ).toBe(true);
    });
});
