import {
    createServer,
    type IncomingMessage,
    type ServerResponse,
} from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.MOCK_GEMINI_PORT ?? 4010);
const HOST = "127.0.0.1";

const BASE_DELAY_MS = Number(process.env.MOCK_GEMINI_BASE_DELAY_MS ?? 4_000);
const DELAY_PER_MB_MS = Number(
    process.env.MOCK_GEMINI_DELAY_PER_MB_MS ?? 6_000,
);
const MAX_DELAY_MS = Number(process.env.MOCK_GEMINI_MAX_DELAY_MS ?? 150_000);

const RATE_OPERATION_ERROR = Number(process.env.MOCK_GEMINI_ERROR_RATE ?? 0.12);
const RATE_EMPTY_INDEX = Number(process.env.MOCK_GEMINI_EMPTY_RATE ?? 0.08);
const RATE_QUOTA = Number(process.env.MOCK_GEMINI_QUOTA_RATE ?? 0.08);
const RATE_UNAVAILABLE = Number(
    process.env.MOCK_GEMINI_UNAVAILABLE_RATE ?? 0.07,
);
const FAILURE_SCALE = Number(process.env.MOCK_GEMINI_FAILURE_RATE ?? 1);

const RATE_UNGROUNDED_ANSWER = Number(
    process.env.MOCK_GEMINI_UNGROUNDED_RATE ?? 0.1,
);

type Outcome = "success" | "error" | "empty" | "quota" | "unavailable";

type MockDocument = {
    name: string;
    displayName: string;
    docId: string | null;
    empty: boolean;
    pages: number;
};

type MockOperation = {
    name: string;
    store: string;
    document: MockDocument;
    readyAt: number;
    outcome: Outcome;
};

type PendingUpload = {
    store: string;
    displayName: string;
    docId: string | null;
    sizeBytes: number;
};

const uploads = new Map<string, PendingUpload>();
const operations = new Map<string, MockOperation>();
const documents = new Map<string, MockDocument>();

function log(...parts: unknown[]) {
    console.log(`[mock-gemini] ${parts.map(String).join(" ")}`);
}

function pickOutcome(): Outcome {
    const error = RATE_OPERATION_ERROR * FAILURE_SCALE;
    const empty = RATE_EMPTY_INDEX * FAILURE_SCALE;
    const quota = RATE_QUOTA * FAILURE_SCALE;
    const unavailable = RATE_UNAVAILABLE * FAILURE_SCALE;

    const roll = Math.random();
    if (roll < error) return "error";
    if (roll < error + empty) return "empty";
    if (roll < error + empty + quota) return "quota";
    if (roll < error + empty + quota + unavailable) return "unavailable";
    return "success";
}

function indexingDelayMs(sizeBytes: number): number {
    const megabytes = sizeBytes / (1024 * 1024);
    const base = BASE_DELAY_MS + megabytes * DELAY_PER_MB_MS;
    const jittered = base * (0.7 + Math.random() * 0.6);
    return Math.round(Math.min(jittered, MAX_DELAY_MS));
}

function readBody(request: IncomingMessage): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        request.on("data", (chunk: Buffer) => chunks.push(chunk));
        request.on("end", () => resolve(Buffer.concat(chunks)));
        request.on("error", reject);
    });
}

function sendJson(
    response: ServerResponse,
    status: number,
    body: unknown,
    headers: Record<string, string> = {},
) {
    const payload = JSON.stringify(body);
    response.writeHead(status, {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(payload),
        ...headers,
    });
    response.end(payload);
}

function sendApiError(
    response: ServerResponse,
    status: number,
    apiStatus: string,
    message: string,
    retryDelaySeconds?: number,
) {
    sendJson(response, status, {
        error: {
            code: status,
            status: apiStatus,
            message,
            details: retryDelaySeconds
                ? [
                      {
                          "@type": "type.googleapis.com/google.rpc.RetryInfo",
                          retryDelay: `${retryDelaySeconds}s`,
                      },
                  ]
                : [],
        },
    });
}

function quotaError(response: ServerResponse) {
    sendApiError(
        response,
        429,
        "RESOURCE_EXHAUSTED",
        "You exceeded your current quota. quotaId: " +
            "GenerateRequestsPerDayPerProjectPerModel-FreeTier, limit: 20 " +
            "(simulated by the mock Gemini server)",
        27,
    );
}

function unavailableError(response: ServerResponse) {
    sendApiError(
        response,
        503,
        "UNAVAILABLE",
        "The model is overloaded. Please try again later. " +
            "(simulated by the mock Gemini server)",
        3,
    );
}

function metadataValue(
    config: Record<string, unknown> | undefined,
    key: string,
): string | null {
    const entries = config?.customMetadata;
    if (!Array.isArray(entries)) return null;

    for (const entry of entries) {
        if (
            entry &&
            typeof entry === "object" &&
            (entry as { key?: string }).key === key
        ) {
            return String(
                (entry as { stringValue?: string }).stringValue ?? "",
            );
        }
    }
    return null;
}

function startUpload(
    request: IncomingMessage,
    response: ServerResponse,
    store: string,
    body: Buffer,
) {
    let config: Record<string, unknown> | undefined;
    try {
        const parsed = JSON.parse(body.toString() || "{}") as Record<
            string,
            unknown
        >;
        config = (parsed.config as Record<string, unknown>) ?? parsed;
    } catch {
        config = undefined;
    }

    const sizeBytes = Number(
        request.headers["x-goog-upload-header-content-length"] ?? 0,
    );
    const headerName = request.headers["x-goog-upload-file-name"];
    const displayName =
        (typeof config?.displayName === "string" ? config.displayName : null) ??
        (typeof headerName === "string" ? headerName : null) ??
        "tài liệu.pdf";

    const sessionId = randomUUID();
    uploads.set(sessionId, {
        store,
        displayName,
        docId: metadataValue(config, "docid"),
        sizeBytes,
    });

    log(
        "upload start",
        displayName,
        `${sizeBytes} bytes`,
        `session=${sessionId}`,
    );

    response.writeHead(200, {
        "content-type": "application/json",
        "x-goog-upload-status": "active",
        "x-goog-upload-url": `http://${HOST}:${PORT}/upload/session/${sessionId}`,
    });
    response.end("{}");
}

function finishUpload(
    request: IncomingMessage,
    response: ServerResponse,
    sessionId: string,
    body: Buffer,
) {
    const pending = uploads.get(sessionId);
    if (!pending) {
        sendApiError(response, 404, "NOT_FOUND", "Unknown upload session.");
        return;
    }

    const command = String(request.headers["x-goog-upload-command"] ?? "");
    if (!command.includes("finalize")) {
        response.writeHead(200, { "x-goog-upload-status": "active" });
        response.end("{}");
        return;
    }

    uploads.delete(sessionId);

    const outcome = pickOutcome();

    if (outcome === "quota") {
        log("upload finalize →", "429 quota");
        quotaError(response);
        return;
    }
    if (outcome === "unavailable") {
        log("upload finalize →", "503 unavailable");
        unavailableError(response);
        return;
    }

    const sizeBytes = body.length || pending.sizeBytes;
    const delay = indexingDelayMs(sizeBytes);
    const operationName = `operations/mock-${randomUUID()}`;
    const document: MockDocument = {
        name: `${pending.store}/documents/mock-${randomUUID()}`,
        displayName: pending.displayName,
        docId: pending.docId,
        empty: outcome === "empty",
        pages: Math.max(1, Math.round(sizeBytes / (120 * 1024))),
    };

    operations.set(operationName, {
        name: operationName,
        store: pending.store,
        document,
        readyAt: Date.now() + delay,
        outcome,
    });

    log(
        "indexing",
        pending.displayName,
        `outcome=${outcome}`,
        `in ${(delay / 1000).toFixed(1)}s`,
    );

    response.writeHead(200, {
        "content-type": "application/json",
        "x-goog-upload-status": "final",
    });
    response.end(
        JSON.stringify({
            name: operationName,
            done: false,
            metadata: {
                "@type":
                    "type.googleapis.com/google.ai.generativelanguage.v1beta.UploadToFileSearchStoreMetadata",
            },
        }),
    );
}

function getOperation(response: ServerResponse, operationName: string) {
    const operation = operations.get(operationName);
    if (!operation) {
        sendApiError(response, 404, "NOT_FOUND", "Unknown operation.");
        return;
    }

    if (Date.now() < operation.readyAt) {
        sendJson(response, 200, { name: operation.name, done: false });
        return;
    }

    if (operation.outcome === "error") {
        log("indexing failed", operation.document.displayName);
        sendJson(response, 200, {
            name: operation.name,
            done: true,
            error: {
                code: 3,
                message:
                    "Không xử lý được tệp PDF này. (simulated by the mock Gemini server)",
            },
        });
        return;
    }

    documents.set(operation.document.name, operation.document);
    log(
        "indexed",
        operation.document.displayName,
        operation.document.empty ? "(no extractable text)" : "",
    );

    sendJson(response, 200, {
        name: operation.name,
        done: true,
        response: {
            parent: operation.store,
            documentName: operation.document.name,
        },
    });
}

const SAMPLE_SENTENCES = [
    "Điểm chuẩn năm nay được xét theo tổ hợp môn đã đăng ký.",
    "Hồ sơ xét tuyển nộp trực tuyến trước ngày 30 tháng 6.",
    "Học phí được thu theo tín chỉ trong từng học kỳ.",
    "Thí sinh phải có chứng chỉ ngoại ngữ còn hiệu lực.",
    "Ký túc xá được ưu tiên cho sinh viên ở xa.",
];

function matchingDocuments(metadataFilter: string | undefined): MockDocument[] {
    const all = [...documents.values()].filter((document) => !document.empty);
    if (!metadataFilter) return all;

    const match = /docid\s*=\s*(.+)$/.exec(metadataFilter.trim());
    if (!match) return all;

    const wanted = match[1].replace(/^["']|["']$/g, "");
    return all.filter((document) => document.docId === wanted);
}

function generateContent(
    response: ServerResponse,
    model: string,
    body: Buffer,
) {
    const outcome = pickOutcome();
    if (outcome === "quota") {
        log("generateContent →", "429 quota", model);
        quotaError(response);
        return;
    }
    if (outcome === "unavailable") {
        log("generateContent →", "503 unavailable", model);
        unavailableError(response);
        return;
    }

    let payload: {
        tools?: Array<{ fileSearch?: { metadataFilter?: string } }>;
    } = {};
    try {
        payload = JSON.parse(body.toString() || "{}");
    } catch {}

    const metadataFilter = payload.tools?.find((tool) => tool.fileSearch)
        ?.fileSearch?.metadataFilter;

    const matches = matchingDocuments(metadataFilter);
    const ungrounded =
        !metadataFilter && Math.random() < RATE_UNGROUNDED_ANSWER;

    if (matches.length === 0 || ungrounded) {
        log(
            "generateContent →",
            matches.length === 0 ? "no chunks" : "ungrounded",
        );
        sendJson(response, 200, {
            candidates: [
                {
                    content: {
                        role: "model",
                        parts: [
                            {
                                text: "Thông tin này không có trong tài liệu hiện có.",
                            },
                        ],
                    },
                    finishReason: "STOP",
                },
            ],
        });
        return;
    }

    const cited = matches.slice(0, 3);
    const answer = cited
        .map(
            (document, index) =>
                `${SAMPLE_SENTENCES[index % SAMPLE_SENTENCES.length]} ` +
                `(theo ${document.displayName})`,
        )
        .join(" ");

    const groundingChunks = cited.map((document, index) => ({
        retrievedContext: {
            title: document.displayName,
            pageNumber: 1 + (index % document.pages),
            text: `${SAMPLE_SENTENCES[index % SAMPLE_SENTENCES.length]} Trích từ ${document.displayName}.`,
            customMetadata: document.docId
                ? [{ key: "docid", stringValue: document.docId }]
                : [],
        },
    }));

    log("generateContent →", `${groundingChunks.length} chunk(s)`, model);

    sendJson(response, 200, {
        candidates: [
            {
                content: { role: "model", parts: [{ text: answer }] },
                finishReason: "STOP",
                groundingMetadata: {
                    groundingChunks,
                    groundingSupports: groundingChunks.map((_, index) => ({
                        segment: {
                            startIndex: 0,
                            endIndex: answer.length,
                            text: answer,
                        },
                        groundingChunkIndices: [index],
                    })),
                },
            },
        ],
        usageMetadata: {
            promptTokenCount: 128,
            candidatesTokenCount: answer.length,
        },
    });
}

function deleteDocument(response: ServerResponse, documentName: string) {
    if (!documents.has(documentName)) {
        log("delete →", "404", documentName);
        sendApiError(response, 404, "NOT_FOUND", "Document not found.");
        return;
    }

    documents.delete(documentName);
    log("delete →", "ok", documentName);
    sendJson(response, 200, {});
}

async function handle(request: IncomingMessage, response: ServerResponse) {
    const url = new URL(request.url ?? "/", `http://${HOST}:${PORT}`);
    const path = decodeURIComponent(url.pathname).replace(/^\/+/, "");
    const method = request.method ?? "GET";
    const body = await readBody(request);

    const uploadStart =
        /^upload\/v1beta\/(fileSearchStores\/[^:]+):uploadToFileSearchStore$/.exec(
            path,
        );
    if (method === "POST" && uploadStart) {
        startUpload(request, response, uploadStart[1], body);
        return;
    }

    const uploadSession = /^upload\/session\/([^/]+)$/.exec(path);
    if (method === "POST" && uploadSession) {
        finishUpload(request, response, uploadSession[1], body);
        return;
    }

    const operationPath = /^v1beta\/(operations\/[^/]+)$/.exec(path);
    if (method === "GET" && operationPath) {
        getOperation(response, operationPath[1]);
        return;
    }

    if (method === "GET" && path === "v1beta/fileSearchStores") {
        const stores = new Set(
            [...operations.values(), ...documents.values()].map((entry) =>
                "store" in entry
                    ? entry.store
                    : entry.name.split("/documents/")[0],
            ),
        );
        stores.add(
            process.env.GEMINI_FILE_SEARCH_STORE ?? "fileSearchStores/mock",
        );
        sendJson(response, 200, {
            fileSearchStores: [...stores].map((name) => ({
                name,
                displayName: "mock store",
            })),
        });
        return;
    }

    const generate = /^v1beta\/models\/([^:]+):generateContent$/.exec(path);
    if (method === "POST" && generate) {
        generateContent(response, generate[1], body);
        return;
    }

    const documentPath =
        /^v1beta\/(fileSearchStores\/[^/]+\/documents\/[^/]+)$/.exec(path);
    if (method === "DELETE" && documentPath) {
        deleteDocument(response, documentPath[1]);
        return;
    }

    log("unhandled", method, path);
    sendApiError(
        response,
        404,
        "NOT_FOUND",
        `The mock Gemini server does not implement ${method} /${path}.`,
    );
}

createServer((request, response) => {
    handle(request, response).catch((error: unknown) => {
        log("crash", String(error));
        if (!response.headersSent) {
            sendApiError(response, 500, "INTERNAL", String(error));
        } else {
            response.end();
        }
    });
}).listen(PORT, HOST, () => {
    log(`listening on http://${HOST}:${PORT}`);
    log(`set GEMINI_BASE_URL=http://${HOST}:${PORT} in .env.local`);
});
