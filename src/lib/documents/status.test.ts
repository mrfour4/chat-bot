import { describe, expect, it } from "vitest";

import { isPending, isStale, STALE_AFTER_MS } from "@/lib/documents/status";

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
    expect(isStale({ status: "indexing", updated_at: ago(30_000) }, now)).toBe(
      false,
    );
  });

  it("is true once nothing could still be running", () => {
    expect(
      isStale({ status: "indexing", updated_at: ago(STALE_AFTER_MS + 1000) }, now),
    ).toBe(true);
  });

  it("covers pending as well as indexing", () => {
    // A row whose worker died before it ever claimed the document looks exactly
    // like one that was only just created. The clock is what tells them apart.
    expect(
      isStale({ status: "pending", updated_at: ago(STALE_AFTER_MS + 1000) }, now),
    ).toBe(true);
  });

  it("never reports a settled document as stale", () => {
    // Re-driving a ready document would re-upload it to Gemini for nothing.
    expect(
      isStale({ status: "ready", updated_at: ago(STALE_AFTER_MS * 100) }, now),
    ).toBe(false);
    expect(
      isStale({ status: "failed", updated_at: ago(STALE_AFTER_MS * 100) }, now),
    ).toBe(false);
  });

  it("does not treat an unreadable timestamp as stale forever", () => {
    // Otherwise every poll would requeue the row, which looks like activity
    // and is actually a loop.
    expect(isStale({ status: "pending", updated_at: "not a date" }, now)).toBe(
      false,
    );
  });

  it("is exclusive at the boundary", () => {
    expect(
      isStale({ status: "pending", updated_at: ago(STALE_AFTER_MS) }, now),
    ).toBe(false);
  });
});
