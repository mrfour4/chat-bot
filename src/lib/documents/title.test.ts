import { describe, expect, it } from "vitest";

import { deriveTitle } from "@/lib/documents/title";

describe("deriveTitle", () => {
    it("drops the extension and unslugs the name", () => {
        expect(deriveTitle("tuyen-sinh-2026.pdf")).toBe("tuyen sinh 2026");
    });

    it("treats underscores like hyphens", () => {
        expect(deriveTitle("de_an_tuyen_sinh.pdf")).toBe("de an tuyen sinh");
    });

    it("keeps Vietnamese characters intact", () => {
        expect(deriveTitle("Đề án tuyển sinh 2026.pdf")).toBe(
            "Đề án tuyển sinh 2026",
        );
    });

    it("copes with a name that has no extension", () => {
        expect(deriveTitle("thong-bao")).toBe("thong bao");
    });

    it("falls back when the name reduces to nothing", () => {
        expect(deriveTitle("---.pdf")).toBe("Tài liệu chưa đặt tên");
        expect(deriveTitle(".pdf")).toBe("Tài liệu chưa đặt tên");
    });
});
