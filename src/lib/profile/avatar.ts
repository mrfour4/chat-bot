export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export type AvatarMime = "image/png" | "image/jpeg" | "image/webp";

export type AvatarExtension = "png" | "jpg" | "webp";

const EXTENSIONS: Record<AvatarMime, AvatarExtension> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
};

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff];
const RIFF = [0x52, 0x49, 0x46, 0x46];
const WEBP = [0x57, 0x45, 0x42, 0x50];

function matches(bytes: Uint8Array, signature: number[], offset = 0): boolean {
    if (bytes.length < offset + signature.length) return false;
    return signature.every((byte, index) => bytes[offset + index] === byte);
}

export function detectImageType(bytes: Uint8Array): AvatarMime | null {
    if (matches(bytes, PNG)) return "image/png";
    if (matches(bytes, JPEG)) return "image/jpeg";
    if (matches(bytes, RIFF) && matches(bytes, WEBP, 8)) return "image/webp";
    return null;
}

export type AvatarRejectionCode = "empty" | "too-large" | "not-an-image";

export type AvatarValidation =
    | { ok: true; mimeType: AvatarMime; extension: AvatarExtension }
    | { ok: false; code: AvatarRejectionCode };

export function validateAvatar(input: {
    mimeType: string;
    bytes: Uint8Array;
}): AvatarValidation {
    if (input.bytes.length === 0) return { ok: false, code: "empty" };

    if (input.bytes.length > MAX_AVATAR_BYTES) {
        return { ok: false, code: "too-large" };
    }

    const mimeType = detectImageType(input.bytes);
    if (!mimeType) return { ok: false, code: "not-an-image" };

    return { ok: true, mimeType, extension: EXTENSIONS[mimeType] };
}

export function avatarPath(userId: string, extension: AvatarExtension): string {
    return `${userId}/avatar.${extension}`;
}
