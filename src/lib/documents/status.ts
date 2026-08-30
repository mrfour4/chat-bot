import type { DocumentStatus } from "@/lib/db";

export function isPending(status: DocumentStatus): boolean {
    return status === "pending" || status === "indexing";
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
