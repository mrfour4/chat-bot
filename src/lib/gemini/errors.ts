import { describeError } from "@/lib/documents/errors";

export const FREE_TIER_DAILY_REQUESTS = 20;

export type GeminiFailureKind = "quota" | "unavailable" | "other";

export type GeminiFailure = {
    kind: GeminiFailureKind;
    retryable: boolean;

    retryAfterMs: number | null;

    message: string;

    detail: string;
};

const QUOTA_MESSAGE =
    `Đã hết hạn mức Gemini cho hôm nay (gói miễn phí cho phép ` +
    `${FREE_TIER_DAILY_REQUESTS} lượt/ngày với mỗi mô hình). Tài liệu chưa được ` +
    `lập chỉ mục — hãy thử lại sau khi hạn mức được đặt lại.`;

const UNAVAILABLE_MESSAGE =
    "Máy chủ Gemini đang quá tải. Vui lòng thử lại sau ít phút.";

function parseRetryDelay(value: unknown): number | null {
    if (typeof value !== "string") return null;
    const seconds = Number.parseFloat(value.replace(/s$/, ""));
    return Number.isFinite(seconds) ? Math.round(seconds * 1000) : null;
}

type ApiErrorBody = {
    error?: {
        code?: number;
        status?: string;
        message?: string;
        details?: Array<{ "@type"?: string; retryDelay?: string }>;
    };
};

export function classifyGeminiError(error: unknown): GeminiFailure {
    const detail = describeError(error);
    const status = (error as { status?: number } | null)?.status;

    let body: ApiErrorBody | null = null;
    try {
        const raw =
            error instanceof Error ? error.message : String(error ?? "");
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object") body = parsed as ApiErrorBody;
    } catch {}

    const code = body?.error?.code ?? status;
    const apiStatus = body?.error?.status;

    const retryAfterMs =
        body?.error?.details
            ?.map((entry) => parseRetryDelay(entry.retryDelay))
            .find((ms): ms is number => ms !== null) ?? null;

    if (code === 429 || apiStatus === "RESOURCE_EXHAUSTED") {
        return {
            kind: "quota",
            retryable: true,
            retryAfterMs,
            message: QUOTA_MESSAGE,
            detail,
        };
    }

    if (code === 503 || apiStatus === "UNAVAILABLE") {
        return {
            kind: "unavailable",
            retryable: true,
            retryAfterMs,
            message: UNAVAILABLE_MESSAGE,
            detail,
        };
    }

    return {
        kind: "other",
        retryable: false,
        retryAfterMs,
        message: detail,
        detail,
    };
}
