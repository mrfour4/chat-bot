import { describe, expect, it } from "vitest";

import {
    describeConnections,
    hasPassword,
    initials,
} from "@/lib/profile/identities";

const identity = (provider: string, id = provider) => ({
    identity_id: `identity-${id}`,
    provider,
});

describe("hasPassword", () => {
    it("is true when an email identity exists", () => {
        expect(hasPassword([identity("email")])).toBe(true);
    });

    it("is false for a Google-only account", () => {
        expect(hasPassword([identity("google")])).toBe(false);
    });

    it("is false when there are no identities at all", () => {
        expect(hasPassword([])).toBe(false);
    });
});

describe("describeConnections", () => {
    it("reports Google as connected, and disconnectable when a password exists", () => {
        const google = describeConnections([
            identity("email"),
            identity("google"),
        ]).google;

        expect(google.connected).toBe(true);
        expect(google.identityId).toBe("identity-google");
        expect(google.canDisconnect).toBe(true);
        expect(google.blockedReason).toBeNull();
    });

    it("refuses to disconnect the only way of signing in", () => {
        const google = describeConnections([identity("google")]).google;

        expect(google.connected).toBe(true);
        expect(
            google.canDisconnect,
            "removing it would lock the account out entirely",
        ).toBe(false);
        expect(google.blockedReason).toBe("lastIdentity");
    });

    it("reports Google as not connected when only a password exists", () => {
        const google = describeConnections([identity("email")]).google;

        expect(google.connected).toBe(false);
        expect(google.identityId).toBeNull();
        expect(google.canDisconnect).toBe(false);
    });

    it("counts a third provider as another way in", () => {
        const google = describeConnections([
            identity("google"),
            identity("github"),
        ]).google;

        expect(google.canDisconnect).toBe(true);
    });
});

describe("initials", () => {
    it("takes the first letter of the first and last word", () => {
        expect(initials("Lê Quốc Tú", "x@example.com")).toBe("LT");
    });

    it("handles a single word", () => {
        expect(initials("Tú", "x@example.com")).toBe("T");
    });

    it("falls back to the email when there is no name", () => {
        expect(initials(null, "quoctu@example.com")).toBe("Q");
        expect(initials("   ", "quoctu@example.com")).toBe("Q");
    });

    it("keeps Vietnamese letters rather than stripping their marks", () => {
        expect(initials("Đặng Ơn", "x@example.com")).toBe("ĐƠ");
    });

    it("never returns an empty string", () => {
        expect(initials(null, "")).toBe("?");
    });
});
