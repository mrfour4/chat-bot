import { describe, expect, it } from "vitest";

import type { GroundingMetadata } from "@google/genai";

import { extractCitations } from "@/lib/rag/citations";

const DOC_A = "ead25ab2-df69-4d51-8b08-93844d163a57";
const DOC_B = "11111111-2222-3333-4444-555555555555";

function chunk(overrides: {
  title?: string;
  page?: number;
  text?: string;
  docId?: string | null;
}) {
  return {
    retrievedContext: {
      title: overrides.title ?? "uit-page-1.pdf",
      pageNumber: overrides.page,
      text: overrides.text ?? "Mã cơ sở đào tạo: QSC",
      ...(overrides.docId === null
        ? {}
        : {
            customMetadata: [
              { key: "docid", stringValue: overrides.docId ?? DOC_A },
            ],
          }),
    },
  };
}

describe("extractCitations", () => {
  it("returns nothing when there is no grounding", () => {
    expect(extractCitations(undefined)).toEqual([]);
    expect(extractCitations({})).toEqual([]);
  });

  it("reads file name, page and documentId from a chunk", () => {
    const metadata: GroundingMetadata = {
      groundingChunks: [chunk({ title: "uit-page-1.pdf", page: 3 })],
    };

    expect(extractCitations(metadata)).toEqual([
      {
        documentId: DOC_A,
        fileName: "uit-page-1.pdf",
        page: 3,
        snippet: "Mã cơ sở đào tạo: QSC",
      },
    ]);
  });

  it("survives a chunk with no documentId metadata", () => {
    // Nothing guarantees every chunk carries our key -- a document indexed
    // before the key existed, or by another tool, still has to render.
    const metadata: GroundingMetadata = {
      groundingChunks: [chunk({ docId: null })],
    };

    expect(extractCitations(metadata)[0]).toMatchObject({
      documentId: null,
      fileName: "uit-page-1.pdf",
    });
  });

  it("uses null rather than a wrong page number when the page is missing", () => {
    const metadata: GroundingMetadata = {
      groundingChunks: [chunk({ page: undefined })],
    };

    expect(extractCitations(metadata)[0].page).toBeNull();
  });

  it("collapses repeated chunks from the same document and page", () => {
    // Retrieval routinely returns several chunks from one page. Rendering
    // "trang 1" four times under an answer is noise, not provenance.
    const metadata: GroundingMetadata = {
      groundingChunks: [
        chunk({ page: 1, text: "đoạn một" }),
        chunk({ page: 1, text: "đoạn hai" }),
        chunk({ page: 2, text: "đoạn ba" }),
      ],
    };

    const citations = extractCitations(metadata);
    expect(citations).toHaveLength(2);
    expect(citations.map((c) => c.page)).toEqual([1, 2]);
  });

  it("keeps same-page chunks from different documents apart", () => {
    const metadata: GroundingMetadata = {
      groundingChunks: [
        chunk({ page: 1, docId: DOC_A, title: "uit-page-1.pdf" }),
        chunk({ page: 1, docId: DOC_B, title: "iuh-page-1.pdf" }),
      ],
    };

    expect(extractCitations(metadata)).toHaveLength(2);
  });

  it("trims a long snippet without cutting a word in half", () => {
    const metadata: GroundingMetadata = {
      groundingChunks: [
        chunk({ text: "Trường Đại học Công nghệ Thông tin ".repeat(20) }),
      ],
    };

    const snippet = extractCitations(metadata)[0].snippet!;
    expect(snippet.length).toBeLessThanOrEqual(201);
    expect(snippet.endsWith("…")).toBe(true);
    expect(snippet).not.toMatch(/\s…$/);
  });

  it("orders citations by document, then page", () => {
    const metadata: GroundingMetadata = {
      groundingChunks: [
        chunk({ page: 5, docId: DOC_A }),
        chunk({ page: 2, docId: DOC_A }),
        chunk({ page: 1, docId: DOC_B, title: "iuh-page-1.pdf" }),
      ],
    };

    const citations = extractCitations(metadata);
    expect(citations.map((c) => [c.fileName, c.page])).toEqual([
      ["iuh-page-1.pdf", 1],
      ["uit-page-1.pdf", 2],
      ["uit-page-1.pdf", 5],
    ]);
  });
});
