import { Button } from "@/components/ui/button";
import type { DocumentRow } from "@/lib/db";

/**
 * Inline rather than a modal, for the same reason the delete confirmation used
 * to be: the teacher's eyes stay on the row. The viewer is the browser's own --
 * every desktop browser ships a competent one, and pdf.js would be a megabyte
 * of JavaScript to rebuild it.
 */
export function DocumentPreview({
    document,
    onClose,
}: {
    document: DocumentRow;
    onClose: () => void;
}) {
    const href = `/api/documents/${document.id}/file`;

    return (
        <div className="mt-4">
            <div className="flex flex-wrap items-center gap-3 pb-3">
                <Button
                    variant="outline"
                    size="sm"
                    render={<a href={`${href}?download=1`}>Tải xuống</a>}
                />
                {/* Always offered, not only as an error path: iOS Safari and
                    some Android browsers refuse to render a PDF inside an
                    iframe, and there is no reliable way to detect that before
                    it fails. A visible link degrades to working rather than to
                    a blank rectangle. */}
                <Button
                    variant="link"
                    size="sm"
                    className="text-ink-soft"
                    render={
                        <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Mở trong tab mới
                        </a>
                    }
                />
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="ml-auto text-ink-soft"
                >
                    Đóng
                </Button>
            </div>

            <iframe
                src={href}
                title={`Xem trước ${document.title}`}
                className="h-[70vh] max-h-[720px] w-full rounded-md border border-rule bg-panel"
            />
        </div>
    );
}
