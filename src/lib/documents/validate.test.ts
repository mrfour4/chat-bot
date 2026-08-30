import { describe, expect, it } from "vitest";

import { MAX_UPLOAD_BYTES, validateUpload } from "@/lib/documents/validate";

const PDF_MIME = "application/pdf";

function pdfBytes(size = 512): Uint8Array {
    const bytes = new Uint8Array(size);
    bytes.set(new TextEncoder().encode("%PDF-1.7\n"));
    return bytes;
}

function upload(overrides: Partial<Parameters<typeof validateUpload>[0]> = {}) {
    return validateUpload({
        fileName: "tuyen-sinh.pdf",
        mimeType: PDF_MIME,
        bytes: pdfBytes(),
        ...overrides,
    });
}

const VIETNAMESE =
    /[ăâđêôơưàáảãạằắẳẵặầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵ]/i;

describe("validateUpload", () => {
    it("accepts a valid PDF", () => {
        expect(upload()).toEqual({ ok: true });
    });

    it("rejects an empty file", () => {
        const result = upload({ bytes: new Uint8Array(0) });
        expect(result).toMatchObject({ ok: false, code: "empty" });
    });

    it("rejects a file over the size cap", () => {
        const result = upload({ bytes: pdfBytes(MAX_UPLOAD_BYTES + 1) });
        expect(result).toMatchObject({ ok: false, code: "too-large" });
    });

    it("accepts a file exactly at the size cap", () => {
        expect(upload({ bytes: pdfBytes(MAX_UPLOAD_BYTES) })).toEqual({
            ok: true,
        });
    });

    it("rejects a non-PDF mime type", () => {
        const result = upload({ mimeType: "image/png", fileName: "anh.png" });
        expect(result).toMatchObject({ ok: false, code: "wrong-mime" });
    });

    it("rejects a file claiming to be a PDF whose bytes are not", () => {
        const result = upload({
            fileName: "tuyen-sinh.pdf",
            bytes: new TextEncoder().encode("MZ\x90\x00 not a pdf at all"),
        });
        expect(result).toMatchObject({ ok: false, code: "not-a-pdf" });
    });

    it("rejects a PDF signature that is not at the very start", () => {
        const shifted = new Uint8Array(512);
        shifted.set(new TextEncoder().encode("\n%PDF-1.7"));
        expect(upload({ bytes: shifted })).toMatchObject({
            ok: false,
            code: "not-a-pdf",
        });
    });

    it("explains every rejection in Vietnamese", () => {
        const rejections = [
            upload({ bytes: new Uint8Array(0) }),
            upload({ bytes: pdfBytes(MAX_UPLOAD_BYTES + 1) }),
            upload({ mimeType: "image/png" }),
            upload({ bytes: new TextEncoder().encode("nope") }),
        ];

        for (const result of rejections) {
            expect(result.ok).toBe(false);
            if (result.ok) continue;
            expect(result.message.length).toBeGreaterThan(0);
            expect(result.message).toMatch(VIETNAMESE);
        }
    });
});
