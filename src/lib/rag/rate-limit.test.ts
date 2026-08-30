import { beforeEach, describe, expect, it } from "vitest";

import { checkRateLimit, resetRateLimit } from "@/lib/rag/rate-limit";

describe("checkRateLimit", () => {
    beforeEach(resetRateLimit);

    it("allows a normal burst of questions", () => {
        for (let i = 0; i < 8; i += 1) {
            expect(checkRateLimit("1.2.3.4").allowed).toBe(true);
        }
    });

    it("blocks the ninth question in a window", () => {
        for (let i = 0; i < 8; i += 1) checkRateLimit("1.2.3.4");

        const result = checkRateLimit("1.2.3.4");
        expect(result.allowed).toBe(false);
        expect(result.retryAfterSeconds).toBeGreaterThan(0);
    });

    it("keeps callers separate", () => {
        for (let i = 0; i < 9; i += 1) checkRateLimit("1.2.3.4");

        // One noisy visitor must not lock everyone else out of a public page.
        expect(checkRateLimit("5.6.7.8").allowed).toBe(true);
    });

    it("lets a blocked caller back in once the window passes", () => {
        const start = 1_000_000;
        for (let i = 0; i < 9; i += 1) checkRateLimit("1.2.3.4", start);

        expect(checkRateLimit("1.2.3.4", start).allowed).toBe(false);
        expect(checkRateLimit("1.2.3.4", start + 60_001).allowed).toBe(true);
    });
});
