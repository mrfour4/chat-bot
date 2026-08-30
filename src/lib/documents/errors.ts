/**
 * Long enough to keep a useful Gemini error, short enough that the row stays
 * readable and the failure card on screen does not become a wall of JSON.
 */
export const MAX_ERROR_MESSAGE = 500;

const FALLBACK = "Lỗi không xác định trong quá trình lập chỉ mục.";

/**
 * Turns anything that can be thrown into a short message fit for
 * `documents.error_message` and for a teacher to read.
 *
 * Non-`Error` throws are the reason this exists: without it, a rejected fetch
 * or a thrown object lands `"[object Object]"` in front of a teacher, which
 * tells them nothing and tells us nothing either.
 */
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
