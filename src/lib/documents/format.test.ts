import { describe, expect, it } from "vitest";

import { formatFileSize } from "@/lib/documents/format";

describe("formatFileSize", () => {
    it("shows small files in bytes", () => {
        expect(formatFileSize(0)).toBe("0 B");
        expect(formatFileSize(999)).toBe("999 B");
    });

    it("switches to KB at 1024", () => {
        expect(formatFileSize(1024)).toBe("1 KB");
        expect(formatFileSize(480_476)).toBe("469 KB");
    });

    it("switches to MB, with one decimal", () => {
        expect(formatFileSize(4_163_258)).toBe("4.0 MB");
        expect(formatFileSize(20 * 1024 * 1024)).toBe("20.0 MB");
    });
});
