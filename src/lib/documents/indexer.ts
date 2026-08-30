import "server-only";

import { describeError } from "@/lib/documents/errors";
import { getFileSearchStore, getGemini } from "@/lib/gemini/client";
import { classifyGeminiError } from "@/lib/gemini/errors";

export const INDEXING_TIMEOUT_MS = 180_000;

const POLL_INTERVAL_MS = 2_000;

export const DOCUMENT_ID_KEY = "docid";

const MAX_UNAVAILABLE_ATTEMPTS = 3;
const MAX_QUOTA_ATTEMPTS = 2;
const MAX_QUOTA_WAIT_MS = 10_000;

async function withTransientRetry<T>(fn: () => Promise<T>): Promise<T> {
    for (let attempt = 1; ; attempt += 1) {
        try {
            return await fn();
        } catch (error) {
            const failure = classifyGeminiError(error);

            const limit =
                failure.kind === "unavailable"
                    ? MAX_UNAVAILABLE_ATTEMPTS
                    : failure.kind === "quota"
                      ? MAX_QUOTA_ATTEMPTS
                      : 0;

            const wait = failure.retryAfterMs ?? 3_000 * attempt;
            const worthWaiting =
                failure.kind !== "quota" || wait <= MAX_QUOTA_WAIT_MS;

            if (attempt >= limit || !worthWaiting) throw error;

            await new Promise((resolve) => setTimeout(resolve, wait));
        }
    }
}

export type IndexOutcome =
    | { ok: true; geminiDocumentName: string; chunkCount: number }
    | { ok: false; message: string };

const PROBE_PROMPT = "Tài liệu này nói về nội dung gì?";

const PROBE_MODEL = process.env.GEMINI_PROBE_MODEL ?? "gemini-3.6-flash";

export async function indexDocument(input: {
    documentId: string;
    fileName: string;
    bytes: Uint8Array;
}): Promise<IndexOutcome> {
    const ai = getGemini();
    const store = getFileSearchStore();

    let uploadedName: string | undefined;

    try {
        let operation = await ai.fileSearchStores.uploadToFileSearchStore({
            fileSearchStoreName: store,
            file: new Blob([input.bytes as BufferSource], {
                type: "application/pdf",
            }),
            config: {
                mimeType: "application/pdf",
                displayName: input.fileName,

                customMetadata: [
                    { key: DOCUMENT_ID_KEY, stringValue: input.documentId },
                ],
            },
        });

        const deadline = Date.now() + INDEXING_TIMEOUT_MS;
        while (!operation.done) {
            if (Date.now() > deadline) {
                return {
                    ok: false,
                    message:
                        `Quá thời gian chờ lập chỉ mục (${INDEXING_TIMEOUT_MS / 1000} giây). ` +
                        "Vui lòng thử lại.",
                };
            }
            await new Promise((resolve) =>
                setTimeout(resolve, POLL_INTERVAL_MS),
            );
            operation = await ai.operations.get({ operation });
        }

        if (operation.error) {
            return {
                ok: false,
                message: describeError(operation.error.message),
            };
        }

        const geminiDocumentName = operation.response?.documentName;
        uploadedName = geminiDocumentName;
        if (!geminiDocumentName) {
            return {
                ok: false,
                message: "Gemini không trả về mã tài liệu sau khi lập chỉ mục.",
            };
        }

        const chunkCount = await countRetrievableChunks(input.documentId);
        if (chunkCount === 0) {
            await discard(geminiDocumentName);
            return {
                ok: false,
                message:
                    "Không đọc được nội dung từ tệp này. Tài liệu đã tải lên nhưng không " +
                    "trích xuất được văn bản nào, nên trợ lý sẽ không thể trả lời dựa trên nó.",
            };
        }

        return { ok: true, geminiDocumentName, chunkCount };
    } catch (error) {
        if (uploadedName) await discard(uploadedName);

        const failure = classifyGeminiError(error);
        if (failure.kind !== "other") {
            console.error(`[indexing] ${failure.kind}: ${failure.detail}`);
        }
        return { ok: false, message: failure.message };
    }
}

async function countRetrievableChunks(documentId: string): Promise<number> {
    const response = await withTransientRetry(() =>
        getGemini().models.generateContent({
            model: PROBE_MODEL,
            contents: PROBE_PROMPT,
            config: {
                tools: [
                    {
                        fileSearch: {
                            fileSearchStoreNames: [getFileSearchStore()],
                            metadataFilter: `${DOCUMENT_ID_KEY}=${documentId}`,
                        },
                    },
                ],
            },
        }),
    );

    return (
        response.candidates?.[0]?.groundingMetadata?.groundingChunks?.length ??
        0
    );
}

export async function deleteFromStore(
    geminiDocumentName: string,
): Promise<void> {
    try {
        await getGemini().fileSearchStores.documents.delete({
            name: geminiDocumentName,
            config: { force: true },
        });
    } catch (error) {
        const status = (error as { status?: number }).status;

        if (status === 404 || status === 403) return;
        throw error;
    }
}

async function discard(geminiDocumentName: string): Promise<void> {
    try {
        await deleteFromStore(geminiDocumentName);
    } catch {}
}
