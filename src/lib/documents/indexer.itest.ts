import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

import { GoogleGenAI } from "@google/genai";
import { afterAll, describe, expect, it } from "vitest";

import { DOCUMENT_ID_KEY, indexDocument } from "@/lib/documents/indexer";

const MODEL = process.env.GEMINI_PROBE_MODEL ?? "gemini-3.6-flash";
const store = process.env.GEMINI_FILE_SEARCH_STORE!;
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const ids = { uit: randomUUID(), iuh: randomUUID() };
const uploaded: string[] = [];

const GROUNDING_RULE =
    "Bạn chỉ được trả lời dựa trên tài liệu được truy xuất. Nếu thông tin không " +
    "có trong tài liệu, hãy trả lời đúng một câu: 'Không có thông tin trong tài liệu hiện có.'";

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
        try {
            return await fn();
        } catch (error) {
            const status = (error as { status?: number }).status;
            if ((status !== 503 && status !== 429) || attempt >= 4) throw error;
            await new Promise((r) => setTimeout(r, 5000 * attempt));
        }
    }
}

async function ask(question: string, documentId?: string) {
    const response = await withRetry(() =>
        ai.models.generateContent({
            model: MODEL,
            contents: question,
            config: {
                systemInstruction: GROUNDING_RULE,
                tools: [
                    {
                        fileSearch: {
                            fileSearchStoreNames: [store],
                            ...(documentId
                                ? { metadataFilter: `documentId=${documentId}` }
                                : {}),
                        },
                    },
                ],
            },
        }),
    );

    const chunks =
        response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];

    return {
        text: (response.text ?? "").replace(/\s+/g, " ").trim(),
        chunkCount: chunks.length,
        titles: [...new Set(chunks.map((c) => c.retrievedContext?.title))],
        pages: chunks.map((c) => c.retrievedContext?.pageNumber),
        documentIds: [
            ...new Set(
                chunks.flatMap((c) =>
                    (c.retrievedContext?.customMetadata ?? [])
                        .filter((m) => m.key === DOCUMENT_ID_KEY)
                        .map((m) => m.stringValue),
                ),
            ),
        ],
    };
}

async function index(key: keyof typeof ids, file: string) {
    const outcome = await indexDocument({
        documentId: ids[key],
        fileName: file,
        bytes: new Uint8Array(readFileSync(`doc-to-test/${file}`)),
    });
    if (outcome.ok) uploaded.push(outcome.geminiDocumentName);
    return outcome;
}

afterAll(async () => {
    for (const name of uploaded) {
        await ai.fileSearchStores.documents.delete({
            name,
            config: { force: true },
        });
    }
});

describe("indexDocument against the real API", () => {
    it("indexes a text PDF and reports retrievable chunks", async () => {
        const outcome = await index("uit", "uit-page-1.pdf");
        console.log("uit-page-1.pdf →", JSON.stringify(outcome));

        expect(outcome.ok).toBe(true);
        if (!outcome.ok) return;
        expect(outcome.chunkCount).toBeGreaterThan(0);
        expect(outcome.geminiDocumentName).toContain("fileSearchStores/");
    }, 120_000);

    it("indexes a scanned, image-only PDF", async () => {
        const outcome = await index("iuh", "iuh-page-1.pdf");
        console.log("iuh-page-1.pdf →", JSON.stringify(outcome));

        expect(outcome.ok).toBe(true);
        if (!outcome.ok) return;
        expect(outcome.chunkCount).toBeGreaterThan(0);
    }, 120_000);

    it("scopes retrieval to one document, and citations carry the documentId", async () => {
        const result = await ask("Tài liệu này của trường nào?", ids.uit);
        console.log("scoping →", JSON.stringify(result, null, 1));

        expect(result.chunkCount).toBeGreaterThan(0);
        expect(result.titles).toEqual(["uit-page-1.pdf"]);

        expect(result.documentIds).toEqual([ids.uit]);
        expect(result.pages.every((p) => typeof p === "number")).toBe(true);
    }, 60_000);

    it("answers a UIT question from the UIT document", async () => {
        const result = await ask(
            "Mã trường (mã cơ sở đào tạo) của trường này là gì? Các phương thức tuyển sinh nào được nêu?",
            ids.uit,
        );
        console.log("grounded UIT →", result.text.slice(0, 400));

        expect(result.chunkCount).toBeGreaterThan(0);
        expect(result.text).not.toContain("Không có thông tin");
    }, 60_000);

    it("does not answer an IUH question from the UIT document", async () => {
        const result = await ask(
            "Đối tượng tuyển sinh đại học chính quy năm 2025 của Trường Đại học Công nghiệp TP.HCM là ai?",
            ids.uit,
        );
        console.log("cross-doc (asked of UIT) →", result.text.slice(0, 300));

        expect(result.text).toContain("Không có thông tin");
    }, 60_000);

    it("answers that same question from the IUH document", async () => {
        const result = await ask(
            "Đối tượng tuyển sinh đại học chính quy năm 2025 là ai?",
            ids.iuh,
        );
        console.log("cross-doc (asked of IUH) →", result.text.slice(0, 300));

        expect(result.chunkCount).toBeGreaterThan(0);
        expect(result.text).not.toContain("Không có thông tin");
    }, 60_000);

    it("refuses a question absent from every document", async () => {
        const result = await ask(
            "Học phí ngành Y khoa là bao nhiêu tiền một năm?",
        );
        console.log("hallucination check →", result.text.slice(0, 300));

        expect(result.text).toContain("Không có thông tin");
    }, 60_000);
});
