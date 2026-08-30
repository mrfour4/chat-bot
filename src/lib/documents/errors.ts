export const MAX_ERROR_MESSAGE = 500;

const FALLBACK = "Lỗi không xác định trong quá trình lập chỉ mục.";

export function describeError(error: unknown): string {
    const raw =
        error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : "";

    const message = raw.trim() || FALLBACK;

    return message.length > MAX_ERROR_MESSAGE
        ? `${message.slice(0, MAX_ERROR_MESSAGE - 1)}…`
        : message;
}
