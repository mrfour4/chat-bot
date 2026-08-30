import { beforeEach, describe, expect, it, vi } from "vitest";

const generateContent = vi.fn();

vi.mock("@/lib/gemini/client", () => ({
    getGemini: () => ({ models: { generateContent } }),
    getFileSearchStore: () => "fileSearchStores/test",
}));

vi.mock("@/lib/env", () => ({
    serverEnv: () => ({ geminiModel: "gemini-3.6-flash" }),
}));

const { askDocuments } = await import("@/lib/rag/ask");
const { REFUSAL } = await import("@/lib/rag/grounding");

const groundedResponse = {
    text: "Mã trường của UIT là QSC.",
    candidates: [
        {
            groundingMetadata: {
                groundingChunks: [
                    {
                        retrievedContext: {
                            title: "uit-page-1.pdf",
                            pageNumber: 1,
                            text: "Mã cơ sở đào tạo: QSC",
                            customMetadata: [
                                { key: "docid", stringValue: "doc-1" },
                            ],
                        },
                    },
                ],
            },
        },
    ],
};

describe("askDocuments", () => {
    beforeEach(() => generateContent.mockReset());

    it("returns the answer with its citations when grounded", async () => {
        generateContent.mockResolvedValue(groundedResponse);

        const result = await askDocuments("Mã trường của UIT là gì?");

        expect(result.grounded).toBe(true);
        expect(result.answer).toBe("Mã trường của UIT là QSC.");
        expect(result.citations).toEqual([
            {
                documentId: "doc-1",
                fileName: "uit-page-1.pdf",
                page: 1,
                snippet: "Mã cơ sở đào tạo: QSC",
            },
        ]);
    });

    it("attaches no citations to a refusal", async () => {
        // Sources under a refusal would imply we found something and did not say so.
        generateContent.mockResolvedValue({
            text: "Học phí ngành Y khoa là 55 triệu đồng.",
            candidates: [{}],
        });

        const result = await askDocuments("Học phí ngành Y khoa?");

        expect(result.grounded).toBe(false);
        expect(result.answer).toBe(REFUSAL);
        expect(result.citations).toEqual([]);
    });

    it("offers the model only file search, never Google Search", async () => {
        // Layer 1 of §5.7. Web grounding would still produce citations, so this
        // would fail silently rather than loudly.
        generateContent.mockResolvedValue(groundedResponse);

        await askDocuments("Mã trường?");

        const tools = generateContent.mock.calls[0][0].config.tools;
        expect(tools).toHaveLength(1);
        expect(tools[0]).toHaveProperty("fileSearch");
        expect(JSON.stringify(tools)).not.toContain("googleSearch");
    });

    // The API-failure path is deliberately not tested here. Vitest 4 surfaces
    // anything thrown from a vi.fn() implementation as a test failure, even when
    // the code under test catches it -- so this cannot be asserted without
    // enabling `dangerouslyIgnoreUnhandledErrors` for the whole suite, which
    // would hide real unhandled errors everywhere to cover six lines.
    //
    // The pieces are covered elsewhere: classifyGeminiError has its own tests
    // against real 429 and 503 payloads, and the path was exercised in
    // production during 2.1.6, where a live 429 produced the expected Vietnamese
    // message on the row.

    it("passes history to the model but still retrieves on every turn", async () => {
        generateContent.mockResolvedValue(groundedResponse);

        await askDocuments("Còn chỉ tiêu thì sao?", [
            { role: "user", parts: [{ text: "Mã trường của UIT?" }] },
            { role: "model", parts: [{ text: "QSC." }] },
        ]);

        const call = generateContent.mock.calls[0][0];
        expect(call.contents).toHaveLength(3);
        expect(call.config.tools[0]).toHaveProperty("fileSearch");
    });
});
