const FALLBACK_TITLE = "Tài liệu chưa đặt tên";

export function deriveTitle(fileName: string): string {
    const title = fileName
        .replace(/\.pdf$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return title || FALLBACK_TITLE;
}
