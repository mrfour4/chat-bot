/**
 * The gate between the browser and the File Search store.
 *
 * Pure by design: no network, no database, no clock. Everything it needs is in
 * its argument, so it can be tested exhaustively and reasoned about in one
 * sitting.
 */

/**
 * Gemini's own limit is 100 MB. Our largest real sample is a 12-page scan at
 * 4.1 MB, so this leaves room for a much longer scanned prospectus while still
 * rejecting anything that is plainly not an admissions document.
 */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** `%PDF-` — the signature every PDF opens with. */
const PDF_SIGNATURE = [0x25, 0x50, 0x44, 0x46, 0x2d];

export type UploadRejectionCode =
  | "empty"
  | "too-large"
  | "wrong-mime"
  | "not-a-pdf";

export type UploadValidation =
  | { ok: true }
  | { ok: false; code: UploadRejectionCode; message: string };

function reject(code: UploadRejectionCode, message: string): UploadValidation {
  return { ok: false, code, message };
}

function startsWithPdfSignature(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_SIGNATURE.length) return false;
  return PDF_SIGNATURE.every((byte, index) => bytes[index] === byte);
}

function formatMegabytes(bytes: number): string {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

/**
 * Checks run cheapest-and-most-certain first, so an oversized file is rejected
 * on its size rather than after inspecting its content.
 *
 * `mimeType` is only a courtesy check. Browsers derive `File.type` from the
 * file extension, so a renamed executable arrives claiming `application/pdf`
 * and passes it. The signature check is the one that actually decides.
 */
export function validateUpload(input: {
  fileName: string;
  mimeType: string;
  bytes: Uint8Array;
}): UploadValidation {
  const { mimeType, bytes } = input;

  if (bytes.length === 0) {
    return reject("empty", "Tệp rỗng. Vui lòng chọn một tệp PDF có nội dung.");
  }

  if (bytes.length > MAX_UPLOAD_BYTES) {
    return reject(
      "too-large",
      `Tệp vượt quá ${formatMegabytes(MAX_UPLOAD_BYTES)}. ` +
        `Tệp của bạn là ${formatMegabytes(bytes.length)}.`,
    );
  }

  if (mimeType !== "application/pdf") {
    return reject(
      "wrong-mime",
      "Chỉ chấp nhận tệp PDF. Vui lòng chuyển tài liệu sang định dạng PDF rồi tải lên lại.",
    );
  }

  if (!startsWithPdfSignature(bytes)) {
    return reject(
      "not-a-pdf",
      "Nội dung tệp không phải là PDF hợp lệ, dù phần mở rộng là .pdf. " +
        "Vui lòng kiểm tra lại tệp.",
    );
  }

  return { ok: true };
}
