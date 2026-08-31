import { describe, expect, it } from "vitest";

import { resolveOrigin } from "@/lib/auth/origin";

describe("resolveOrigin", () => {
    it("uses the configured origin above everything else", () => {
        expect(
            resolveOrigin({
                configured: "https://tuyensinh.example.com",
                forwardedHost: "wrong.example.com",
                host: "also-wrong.example.com",
            }),
        ).toBe("https://tuyensinh.example.com");
    });

    it("drops a trailing slash from the configured origin", () => {
        expect(resolveOrigin({ configured: "https://example.com/" })).toBe(
            "https://example.com",
        );
    });

    it("prefers the forwarded host, which is what Vercel sets", () => {
        expect(
            resolveOrigin({
                forwardedHost: "advisor.vercel.app",
                forwardedProto: "https",
                host: "advisor-internal.vercel.app",
            }),
        ).toBe("https://advisor.vercel.app");
    });

    it("assumes http for loopback, https for anything else", () => {
        expect(resolveOrigin({ host: "localhost:3000" })).toBe(
            "http://localhost:3000",
        );
        expect(resolveOrigin({ host: "127.0.0.1:3000" })).toBe(
            "http://127.0.0.1:3000",
        );
        expect(resolveOrigin({ host: "advisor.vercel.app" })).toBe(
            "https://advisor.vercel.app",
        );
    });

    it("takes the first entry when a proxy chains several", () => {
        expect(
            resolveOrigin({
                forwardedHost: "advisor.vercel.app, inner.vercel.app",
                forwardedProto: "https, http",
            }),
        ).toBe("https://advisor.vercel.app");
    });

    it("refuses a host carrying anything but a host and port", () => {
        const injected = ["example.com", "X-Injected: 1"].join("\r\n");

        for (const host of [
            "example.com/path",
            "example.com?q=1",
            "user@example.com",
            "exam ple.com",
            injected,
            "",
        ]) {
            expect(resolveOrigin({ host }), JSON.stringify(host)).toBeNull();
        }
    });

    it("is null when there is nothing to go on", () => {
        expect(resolveOrigin({})).toBeNull();
    });
});
