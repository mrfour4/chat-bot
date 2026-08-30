import "server-only";

import { getTranslations } from "next-intl/server";

import type { UploadRejectionCode } from "@/lib/documents/validate";

export async function apiMessages() {
    return getTranslations("api");
}

const UPLOAD_MESSAGE_KEYS: Record<UploadRejectionCode, string> = {
    empty: "uploadEmpty",
    "too-large": "uploadTooLarge",
    "wrong-mime": "uploadWrongMime",
    "not-a-pdf": "uploadNotAPdf",
};

export function uploadMessageKey(code: UploadRejectionCode): string {
    return UPLOAD_MESSAGE_KEYS[code];
}
