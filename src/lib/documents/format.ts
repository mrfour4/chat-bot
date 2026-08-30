/**
 * A file size a person can read at a glance.
 *
 * The list previously rendered `(bytes / 1024).toFixed(0)` KB, which shows a
 * 4.1 MB scan as "4066 KB" -- technically true and useless for judging whether
 * a document is the right one.
 */
export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
