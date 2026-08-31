import { describe, expect, it } from "vitest";

import { safeNextPath } from "@/lib/auth/next-path";

describe("safeNextPath", () => {
    it("keeps a relative path, with its query and fragment", () => {
        expect(safeNextPath("/history")).toBe("/history");
        expect(safeNextPath("/chat/abc?tab=1#top")).toBe("/chat/abc?tab=1#top");
    });

    it("falls back to the home page when there is no path", () => {
        expect(safeNextPath(null)).toBe("/");
        expect(safeNextPath("")).toBe("/");
    });

    it("refuses anything that could leave this origin", () => {
        for (const value of [
            "https://evil.example.com",
            "//evil.example.com",
            "/\\evil.example.com",
            "\\\\evil.example.com",
            "http:/evil.example.com",
            "javascript:alert(1)",
            "history",
        ]) {
            expect(safeNextPath(value), value).toBe("/");
        }
    });

    it("refuses control characters, which could split a header", () => {
        const split = ["/history", "Location: https://evil.example.com"].join(
            "\r\n",
        );

        expect(safeNextPath(split)).toBe("/");
        expect(safeNextPath("/history\n")).toBe("/");
        expect(safeNextPath("/his tory")).toBe("/");
    });
});
