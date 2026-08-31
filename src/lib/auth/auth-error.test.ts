import { describe, expect, it } from "vitest";

import { authErrorKind } from "@/lib/auth/auth-error";

describe("authErrorKind", () => {
    it("is none when there is no error", () => {
        expect(authErrorKind(null)).toBe("none");
        expect(authErrorKind(undefined)).toBe("none");
    });

    it("names a rate limit, so it is never reported as a wrong password", () => {
        expect(authErrorKind({ status: 429 })).toBe("rate-limited");
    });

    it("treats a status-less error as the server being unreachable", () => {
        expect(authErrorKind({})).toBe("unreachable");
        expect(authErrorKind({ status: null })).toBe("unreachable");
        expect(authErrorKind({ status: 0 })).toBe("unreachable");
    });

    it("treats any other status as the request being refused", () => {
        for (const status of [400, 401, 403, 422, 500]) {
            expect(authErrorKind({ status }), String(status)).toBe("refused");
        }
    });
});
