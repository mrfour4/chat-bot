import { describe, expect, it } from "vitest";

import {
    FREE_TIER_DAILY_REQUESTS,
    classifyGeminiError,
} from "@/lib/gemini/errors";

function apiError(body: unknown, status?: number): Error {
    const error = new Error(JSON.stringify(body));
    if (status !== undefined) {
        (error as Error & { status?: number }).status = status;
    }
    return error;
}

const QUOTA_PAYLOAD = {
    error: {
        code: 429,
        message:
            "You exceeded your current quota. Quota exceeded for metric: " +
            "generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 20",
        status: "RESOURCE_EXHAUSTED",
        details: [
            { "@type": "type.googleapis.com/google.rpc.Help" },
            {
                "@type": "type.googleapis.com/google.rpc.RetryInfo",
                retryDelay: "2.456s",
            },
        ],
    },
};

const UNAVAILABLE_PAYLOAD = {
    error: {
        code: 503,
        message: "This model is currently experiencing high demand.",
        status: "UNAVAILABLE",
    },
};

describe("classifyGeminiError", () => {
    it("recognises a quota failure and reads the suggested delay", () => {
        const failure = classifyGeminiError(apiError(QUOTA_PAYLOAD, 429));

        expect(failure.kind).toBe("quota");
        expect(failure.retryable).toBe(true);
        expect(failure.retryAfterMs).toBe(2456);
    });

    it("tells the teacher the actual daily limit", () => {
        const failure = classifyGeminiError(apiError(QUOTA_PAYLOAD, 429));

        expect(failure.message).toContain(String(FREE_TIER_DAILY_REQUESTS));
        expect(failure.message).not.toContain("generativelanguage");
        expect(failure.message).not.toContain("{");
    });

    it("recognises an overloaded model", () => {
        const failure = classifyGeminiError(apiError(UNAVAILABLE_PAYLOAD, 503));

        expect(failure.kind).toBe("unavailable");
        expect(failure.retryable).toBe(true);
    });

    it("treats an ordinary Error as not retryable", () => {
        const failure = classifyGeminiError(new Error("tệp hỏng"));

        expect(failure).toMatchObject({
            kind: "other",
            retryable: false,
            message: "tệp hỏng",
        });
    });

    it("survives a message that is not JSON", () => {
        expect(() =>
            classifyGeminiError(new Error("<html>502</html>")),
        ).not.toThrow();
        expect(classifyGeminiError(new Error("<html>502</html>")).kind).toBe(
            "other",
        );
    });

    it("survives null and plain strings", () => {
        expect(() => classifyGeminiError(null)).not.toThrow();
        expect(() => classifyGeminiError("boom")).not.toThrow();
        expect(classifyGeminiError("boom").message).toBe("boom");
    });

    it("still classifies by status code when the body is unparseable", () => {
        const error = new Error("Service Unavailable");
        (error as Error & { status?: number }).status = 503;

        expect(classifyGeminiError(error).kind).toBe("unavailable");
    });
});
