import "server-only";

import { getTranslations } from "next-intl/server";

import type { UploadRejectionCode } from "@/lib/documents/validate";

/**
 * Failure messages a caller is waiting on.
 *
 * The boundary this draws: a message produced **while someone is waiting** is
 * translated, because there is a request and therefore a reader whose language
 * we know. A message a background job *persists* -- an indexing failure written
 * minutes after the tab closed -- is not, because at that point there is no
 * request and no reader to have a language.
 */
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
