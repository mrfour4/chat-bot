import type { DocumentRow, DocumentStatus } from "@/lib/db";

export function isPending(status: DocumentStatus): boolean {
    return status === "pending" || status === "indexing";
}

export const DOCUMENT_DISPLAY_STATUSES = [
    "uploading",
    "indexing",
    "ready",
    "archived",
    "failed",
    "deleted",
] as const;

export type DocumentDisplayStatus = (typeof DOCUMENT_DISPLAY_STATUSES)[number];

export type DocumentLifecycle = Pick<
    DocumentRow,
    "status" | "archived_at" | "deleted_at"
>;

export function displayStatus(
    document: DocumentLifecycle,
): DocumentDisplayStatus {
    if (document.deleted_at) return "deleted";
    if (document.archived_at) return "archived";
    if (document.status === "pending") return "uploading";
    return document.status;
}

export function isDisplayStatus(
    value: string | undefined | null,
): value is DocumentDisplayStatus {
    return DOCUMENT_DISPLAY_STATUSES.includes(value as DocumentDisplayStatus);
}

export function isRetrievable(document: DocumentLifecycle): boolean {
    return displayStatus(document) === "ready";
}

export const STALE_AFTER_MS = 5 * 60 * 1000;

export function isStale(
    document: { status: DocumentStatus; updated_at: string },
    now: number = Date.now(),
): boolean {
    if (!isPending(document.status)) return false;

    const updatedAt = new Date(document.updated_at).getTime();

    if (Number.isNaN(updatedAt)) return false;

    return now - updatedAt > STALE_AFTER_MS;
}
