import { describe, expect, it } from "vitest";

import { MAX_ERROR_MESSAGE, describeError } from "@/lib/documents/errors";

describe("describeError", () => {
    it("uses the message of a thrown Error", () => {
        expect(describeError(new Error("File Search từ chối tệp"))).toBe(
            "File Search từ chối tệp",
        );
    });

    it("uses a thrown string as-is", () => {
        expect(describeError("hết hạn mức")).toBe("hết hạn mức");
    });

    it("falls back to Vietnamese rather than [object Object]", () => {
        const message = describeError({ code: 500 });
        expect(message).not.toContain("[object Object]");
        expect(message).toBe("Lỗi không xác định trong quá trình lập chỉ mục.");
    });

    it("truncates an over-long message", () => {
        const message = describeError(new Error("x".repeat(2000)));
        expect(message).toHaveLength(MAX_ERROR_MESSAGE);
        expect(message.endsWith("…")).toBe(true);
    });
});
