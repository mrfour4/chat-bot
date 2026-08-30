const FALLBACK_TITLE = "Tài liệu chưa đặt tên";

/**
 * A teacher-facing title derived from the uploaded filename.
 *
 * This is the string every citation shows, so `tuyen-sinh-2026.pdf` becoming
 * "tuyen sinh 2026" rather than the raw filename is the difference between a
 * source reference that reads like a document and one that reads like a file
 * listing. Vietnamese characters are left alone.
 */
export function deriveTitle(fileName: string): string {
  const title = fileName
    .replace(/\.pdf$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return title || FALLBACK_TITLE;
}
