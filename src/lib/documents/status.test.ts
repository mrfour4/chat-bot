import { describe, expect, it } from "vitest";

import { isPending } from "@/lib/documents/status";

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
