import { describe, expect, it } from "vitest";

import en from "../../../messages/en.json";
import { loginErrorKey } from "@/lib/auth/login-error";

describe("loginErrorKey", () => {
    it("names a message for each error the app redirects with", () => {
        expect(loginErrorKey("oauth")).toBe("errorOauth");
        expect(loginErrorKey("oauth_cancelled")).toBe("errorOauthCancelled");
        expect(loginErrorKey("confirm")).toBe("errorConfirm");
        expect(loginErrorKey("recovery")).toBe("errorRecovery");
    });

    it("ignores anything else, so a crafted query cannot pick a message", () => {
        for (const value of [
            null,
            undefined,
            "",
            "unknown",
            "toString",
            "constructor",
            "__proto__",
        ]) {
            expect(loginErrorKey(value), String(value)).toBeNull();
        }
    });

    it("names keys that exist in the catalogue", () => {
        const auth = en.auth as Record<string, string | undefined>;

        for (const value of [
            "oauth",
            "oauth_cancelled",
            "confirm",
            "recovery",
        ]) {
            const key = loginErrorKey(value);
            expect(key, value).not.toBeNull();
            expect(typeof auth[key as string], `auth.${key}`).toBe("string");
        }
    });
});
