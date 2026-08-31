import { describe, expect, it } from "vitest";

import {
    MAX_AVATAR_BYTES,
    avatarPath,
    detectImageType,
    validateAvatar,
} from "@/lib/profile/avatar";

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const GIF = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61];

function webp(): Uint8Array {
    const bytes = new Uint8Array(16);
    bytes.set([0x52, 0x49, 0x46, 0x46], 0);
    bytes.set([0x57, 0x45, 0x42, 0x50], 8);
    return bytes;
}

const pad = (head: number[], size = 64) => {
    const bytes = new Uint8Array(size);
    bytes.set(head, 0);
    return bytes;
};

describe("detectImageType", () => {
    it("reads the format from the bytes, not the name", () => {
        expect(detectImageType(pad(PNG))).toBe("image/png");
        expect(detectImageType(pad(JPEG))).toBe("image/jpeg");
        expect(detectImageType(webp())).toBe("image/webp");
    });

    it("is null for an image format the bucket does not accept", () => {
        expect(detectImageType(pad(GIF))).toBeNull();
    });

    it("is null for a truncated file that only starts to look right", () => {
        expect(detectImageType(new Uint8Array([0x89, 0x50]))).toBeNull();
    });

    it("does not mistake a RIFF container for WebP", () => {
        const wav = new Uint8Array(16);
        wav.set([0x52, 0x49, 0x46, 0x46], 0);
        wav.set([0x57, 0x41, 0x56, 0x45], 8);
        expect(detectImageType(wav)).toBeNull();
    });
});

describe("validateAvatar", () => {
    it("accepts a real PNG", () => {
        expect(
            validateAvatar({ mimeType: "image/png", bytes: pad(PNG) }),
        ).toEqual({ ok: true, mimeType: "image/png", extension: "png" });
    });

    it("refuses an empty file", () => {
        const result = validateAvatar({
            mimeType: "image/png",
            bytes: new Uint8Array(0),
        });
        expect(result.ok).toBe(false);
        expect(result.ok === false && result.code).toBe("empty");
    });

    it("refuses a file over the limit", () => {
        const bytes = new Uint8Array(MAX_AVATAR_BYTES + 1);
        bytes.set(PNG, 0);
        const result = validateAvatar({ mimeType: "image/png", bytes });
        expect(result.ok === false && result.code).toBe("too-large");
    });

    it("refuses an executable renamed to .png", () => {
        const result = validateAvatar({
            mimeType: "image/png",
            bytes: pad([0x4d, 0x5a, 0x90, 0x00]),
        });
        expect(
            result.ok === false && result.code,
            "the browser derives File.type from the extension, so the " +
                "declared type agreeing with the name proves nothing",
        ).toBe("not-an-image");
    });

    it("trusts the bytes when the declared type disagrees with them", () => {
        const result = validateAvatar({
            mimeType: "image/png",
            bytes: pad(JPEG),
        });
        expect(result).toEqual({
            ok: true,
            mimeType: "image/jpeg",
            extension: "jpg",
        });
    });

    it("refuses a GIF, which the bucket would reject anyway", () => {
        const result = validateAvatar({
            mimeType: "image/gif",
            bytes: pad(GIF),
        });
        expect(result.ok === false && result.code).toBe("not-an-image");
    });
});

describe("avatarPath", () => {
    const user = "11111111-2222-3333-4444-555555555555";

    it("puts the file in the user's own folder, which is what the policy checks", () => {
        expect(avatarPath(user, "webp")).toBe(`${user}/avatar.webp`);
    });

    it("uses one stable name per user, so a replacement overwrites", () => {
        expect(avatarPath(user, "png")).not.toContain("undefined");
        expect(avatarPath(user, "png")).toBe(`${user}/avatar.png`);
    });
});
