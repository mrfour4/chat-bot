import { describe, expect, it } from "vitest";

import type { GroundingMetadata } from "@google/genai";

import { REFUSAL, enforceGrounding } from "@/lib/rag/grounding";

const HALLUCINATION =
    "Học phí ngành Y khoa là 55 triệu đồng một năm, đóng theo hai học kỳ.";

function grounded(): GroundingMetadata {
    return {
        groundingChunks: [
            {
                retrievedContext: {
                    title: "uit-page-1.pdf",
                    text: "Mã cơ sở đào tạo: QSC",
                    pageNumber: 1,
                },
            },
        ],
    };
}

describe("enforceGrounding", () => {
    it("returns the model's answer when retrieval actually happened", () => {
        const result = enforceGrounding({
            text: "Mã trường của UIT là QSC.",
            groundingMetadata: grounded(),
        });

        expect(result).toEqual({
            grounded: true,
            answer: "Mã trường của UIT là QSC.",
            reason: "ok",
        });
    });

    it("discards the answer entirely when there is no grounding metadata", () => {
        const result = enforceGrounding({
            text: HALLUCINATION,
            groundingMetadata: undefined,
        });

        expect(result.grounded).toBe(false);
        expect(result.reason).toBe("no-metadata");
        // The point: not merely flagged, but gone.
        expect(result.answer).not.toContain("55 triệu");
        expect(result.answer).toBe(REFUSAL);
    });

    it("refuses when the chunk list is empty", () => {
        const result = enforceGrounding({
            text: HALLUCINATION,
            groundingMetadata: { groundingChunks: [] },
        });

        expect(result).toMatchObject({ grounded: false, reason: "no-chunks" });
        expect(result.answer).toBe(REFUSAL);
    });

    it("refuses when metadata exists but carries no chunks field", () => {
        const result = enforceGrounding({
            text: HALLUCINATION,
            groundingMetadata: {},
        });

        expect(result).toMatchObject({ grounded: false, reason: "no-chunks" });
    });

    it("refuses rather than showing an empty bubble", () => {
        const result = enforceGrounding({
            text: "   ",
            groundingMetadata: grounded(),
        });

        expect(result).toMatchObject({ grounded: false, reason: "empty-text" });
        expect(result.answer).toBe(REFUSAL);
    });

    it("never blends the refusal with the model's text", () => {
        const result = enforceGrounding({
            text: HALLUCINATION,
            groundingMetadata: undefined,
        });

        expect(result.answer).toBe(REFUSAL);
        expect(result.answer.length).toBe(REFUSAL.length);
    });

    it("refuses in Vietnamese", () => {
        expect(REFUSAL).toMatch(/[àáâãèéêìíòóôõùúýăđĩũơư]/i);
    });

    it("refuses a long, confident, entirely ungrounded answer", () => {
        // The headline scenario: the model sounds certain and cites nothing. This
        // is the case the whole product rests on.
        const confident =
            "Trường Đại học Y Dược TP.HCM tuyển sinh 1.200 chỉ tiêu ngành Y khoa năm " +
            "2026, điểm chuẩn dự kiến 27,5 và học phí 55 triệu đồng mỗi năm.";

        const result = enforceGrounding({
            text: confident,
            groundingMetadata: undefined,
        });

        expect(result.grounded).toBe(false);
        expect(result.answer).toBe(REFUSAL);
        expect(result.answer).not.toContain("27,5");
        expect(result.answer).not.toContain("1.200");
    });
});
