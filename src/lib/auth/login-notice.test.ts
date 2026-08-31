import { describe, expect, it } from "vitest";

import en from "../../../messages/en.json";
import vi from "../../../messages/vi.json";
import { loginNoticeKey } from "@/lib/auth/login-notice";

describe("loginNoticeKey", () => {
    it("names a message for a completed password reset", () => {
        expect(loginNoticeKey("password-reset")).toBe("noticePasswordReset");
    });

    it("ignores anything else, so a crafted query cannot pick a message", () => {
        for (const value of [
            null,
            undefined,
            "",
            "unknown",
            "toString",
            "__proto__",
        ]) {
            expect(loginNoticeKey(value), String(value)).toBeNull();
        }
    });

    it("names a key both catalogues carry", () => {
        const key = loginNoticeKey("password-reset") as string;

        for (const [locale, messages] of Object.entries({ en, vi })) {
            const auth = messages.auth as Record<string, string | undefined>;
            expect(typeof auth[key], `${locale}: auth.${key}`).toBe("string");
        }
    });
});
