import { describe, expect, it } from "vitest";

import { INDEXING_TIMEOUT_MS } from "@/lib/documents/indexer";
import {
    displayStatus,
    isPending,
    isRetrievable,
    isStale,
    STALE_AFTER_MS,
} from "@/lib/documents/status";

describe("isPending", () => {
    it("is true while the document is still being indexed", () => {
        expect(isPending("pending")).toBe(true);
        expect(isPending("indexing")).toBe(true);
    });

    it("is false once indexing has settled either way", () => {
        expect(isPending("ready")).toBe(false);
        expect(isPending("failed")).toBe(false);
    });
});

describe("isStale", () => {
    const now = Date.UTC(2026, 7, 30, 12, 0, 0);
    const ago = (ms: number) => new Date(now - ms).toISOString();

    it("is false for a document that is still plausibly running", () => {
        expect(
            isStale({ status: "indexing", updated_at: ago(30_000) }, now),
        ).toBe(false);
    });

    it("is true once nothing could still be running", () => {
        expect(
            isStale(
                { status: "indexing", updated_at: ago(STALE_AFTER_MS + 1000) },
                now,
            ),
        ).toBe(true);
    });

    it("covers pending as well as indexing", () => {
        expect(
            isStale(
                { status: "pending", updated_at: ago(STALE_AFTER_MS + 1000) },
                now,
            ),
        ).toBe(true);
    });

    it("never reports a settled document as stale", () => {
        expect(
            isStale(
                { status: "ready", updated_at: ago(STALE_AFTER_MS * 100) },
                now,
            ),
        ).toBe(false);
        expect(
            isStale(
                { status: "failed", updated_at: ago(STALE_AFTER_MS * 100) },
                now,
            ),
        ).toBe(false);
    });

    it("does not treat an unreadable timestamp as stale forever", () => {
        expect(
            isStale({ status: "pending", updated_at: "not a date" }, now),
        ).toBe(false);
    });

    it("is exclusive at the boundary", () => {
        expect(
            isStale(
                { status: "pending", updated_at: ago(STALE_AFTER_MS) },
                now,
            ),
        ).toBe(false);
    });
});

describe("the sweeper's relationship to the indexing deadline", () => {
    it("waits longer than a job is allowed to run", () => {
        expect(STALE_AFTER_MS).toBeGreaterThan(INDEXING_TIMEOUT_MS);
    });
});

describe("displayStatus", () => {
    const base = {
        status: "ready" as const,
        archived_at: null,
        deleted_at: null,
    };

    it("renames pending to what the teacher is actually watching", () => {
        expect(displayStatus({ ...base, status: "pending" })).toBe("uploading");
    });

    it("passes the indexing states through", () => {
        expect(displayStatus({ ...base, status: "indexing" })).toBe("indexing");
        expect(displayStatus({ ...base, status: "ready" })).toBe("ready");
        expect(displayStatus({ ...base, status: "failed" })).toBe("failed");
    });

    it("lets archived cover the indexing state without erasing it", () => {
        const archived = { ...base, archived_at: "2026-08-30T00:00:00Z" };
        expect(displayStatus(archived)).toBe("archived");
        expect(archived.status).toBe("ready");
    });

    it("lets deleted win over archived", () => {
        expect(
            displayStatus({
                ...base,
                archived_at: "2026-08-30T00:00:00Z",
                deleted_at: "2026-08-30T01:00:00Z",
            }),
        ).toBe("deleted");
    });

    it("only calls a document retrievable when Gemini can actually reach it", () => {
        expect(isRetrievable(base)).toBe(true);
        expect(
            isRetrievable({ ...base, archived_at: "2026-08-30T00:00:00Z" }),
        ).toBe(false);
        expect(isRetrievable({ ...base, status: "failed" })).toBe(false);
    });
});
