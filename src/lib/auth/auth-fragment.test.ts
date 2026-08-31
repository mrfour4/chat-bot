import { describe, expect, it } from "vitest";

import { parseAuthFragment } from "@/lib/auth/auth-fragment";

describe("parseAuthFragment", () => {
    it("reads the session Supabase's default recovery email returns", () => {
        const hash =
            "#access_token=header.body.signature&expires_at=1788173325" +
            "&expires_in=3600&refresh_token=iwcx3pd4c5uq&token_type=bearer" +
            "&type=recovery";

        expect(parseAuthFragment(hash)).toEqual({
            accessToken: "header.body.signature",
            refreshToken: "iwcx3pd4c5uq",
            type: "recovery",
            error: null,
        });
    });

    it("works without a leading hash", () => {
        expect(
            parseAuthFragment("access_token=a&refresh_token=b")?.accessToken,
        ).toBe("a");
    });

    it("is null when there is no fragment at all", () => {
        expect(parseAuthFragment("")).toBeNull();
        expect(parseAuthFragment("#")).toBeNull();
    });

    it("is null when the fragment carries no tokens", () => {
        expect(parseAuthFragment("#next=/profile/password")).toBeNull();
    });

    it("needs both tokens, because setSession needs both", () => {
        expect(parseAuthFragment("#access_token=a&type=recovery")).toBeNull();
        expect(parseAuthFragment("#refresh_token=b&type=recovery")).toBeNull();
    });

    it("reports an error the provider put in the fragment", () => {
        const hash =
            "#error=access_denied&error_code=otp_expired" +
            "&error_description=Email+link+is+invalid+or+has+expired";

        expect(parseAuthFragment(hash)).toEqual({
            accessToken: null,
            refreshToken: null,
            type: null,
            error: "otp_expired",
        });
    });

    it("falls back to the error name when there is no code", () => {
        expect(parseAuthFragment("#error=access_denied")?.error).toBe(
            "access_denied",
        );
    });

    it("decodes percent-encoded values", () => {
        expect(
            parseAuthFragment("#access_token=a%2Bb&refresh_token=c")
                ?.accessToken,
        ).toBe("a+b");
    });
});
