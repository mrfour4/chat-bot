import { describe, expect, it } from "vitest";

import { deriveConversationTitle } from "@/lib/chat/conversations";

describe("deriveConversationTitle", () => {
  it("uses a short question as-is", () => {
    expect(deriveConversationTitle("Trường có những ngành nào?")).toBe(
      "Trường có những ngành nào?",
    );
  });

  it("collapses whitespace and newlines", () => {
    expect(deriveConversationTitle("  Học phí\n  bao nhiêu?  ")).toBe(
      "Học phí bao nhiêu?",
    );
  });

  it("truncates a long question without cutting a word in half", () => {
    const long =
      "Cho em hỏi về các phương thức xét tuyển của trường năm nay và điều kiện cụ thể của từng phương thức ạ";

    const title = deriveConversationTitle(long);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(title.endsWith("…")).toBe(true);
    expect(title).not.toMatch(/\s…$/);
  });
});
