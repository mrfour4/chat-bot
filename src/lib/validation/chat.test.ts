import { describe, expect, it } from "vitest";

import { MAX_QUESTION_LENGTH, questionSchema } from "@/lib/validation/chat";

describe("questionSchema", () => {
    it("accepts an ordinary question", () => {
        expect(
            questionSchema.safeParse({
                question: "Có những phương thức xét tuyển nào?",
            }).success,
        ).toBe(true);
    });

    it("rejects whitespace as if it were empty", () => {
        expect(questionSchema.safeParse({ question: "   " }).success).toBe(
            false,
        );
    });

    it("rejects a question past the limit the route also enforces", () => {
        // Same constant on both sides. If they drifted, the composer would
        // happily send something the route rejects.
        expect(
            questionSchema.safeParse({
                question: "a".repeat(MAX_QUESTION_LENGTH + 1),
            }).success,
        ).toBe(false);
    });

    it("trims before measuring", () => {
        const result = questionSchema.safeParse({ question: "  xin chào  " });
        expect(result.data?.question).toBe("xin chào");
    });
});
