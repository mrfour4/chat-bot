import { describe, expect, it } from "vitest";

import {
    decodeCursor,
    deriveConversationTitle,
    encodeCursor,
} from "@/lib/chat/conversations";

describe("deriveConversationTitle", () => {
    it("uses a short question as-is", () => {
        expect(deriveConversationTitle("Trường có những ngành nào?")).toBe(
            "Trường có những ngành nào?",
        );
    });

    it("collapses whitespace and newlines", () => {
        expect(deriveConversationTitle("  Học phí\n  bao nhiêu?  ")).toBe(
            "Học phí bao nhiêu?",
        );
    });

    it("truncates a long question without cutting a word in half", () => {
        const long =
            "Cho em hỏi về các phương thức xét tuyển của trường năm nay và điều kiện cụ thể của từng phương thức ạ";

        const title = deriveConversationTitle(long);
        expect(title.length).toBeLessThanOrEqual(60);
        expect(title.endsWith("…")).toBe(true);
        expect(title).not.toMatch(/\s…$/);
    });
});

describe("message cursors", () => {
    it("round-trips a timestamp and an id", () => {
        const cursor = {
            createdAt: "2026-08-31T03:24:04.712295+00:00",
            id: "8f0d5a1c-1111-2222-3333-444455556666",
        };

        expect(decodeCursor(encodeCursor(cursor))).toEqual(cursor);
    });

    it("splits on the last comma, so a timestamp may contain one", () => {
        expect(decodeCursor("2026-08-31 03:24:04,abc")).toEqual({
            createdAt: "2026-08-31 03:24:04",
            id: "abc",
        });
    });

    it("refuses anything that is not a pair", () => {
        expect(decodeCursor(null)).toBeNull();
        expect(decodeCursor("")).toBeNull();
        expect(decodeCursor("no-comma")).toBeNull();
        expect(decodeCursor(",only-an-id")).toBeNull();
        expect(decodeCursor("only-a-time,")).toBeNull();
    });
});
