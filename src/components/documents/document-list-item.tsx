"use client";

import { useState } from "react";

import { DeleteDocumentDialog } from "@/components/documents/delete-document-dialog";
import { DocumentFailure } from "@/components/documents/document-failure";
import { DocumentPreview } from "@/components/documents/document-preview";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import { Button } from "@/components/ui/button";
import type { DocumentRow } from "@/lib/db";
import { formatFileSize } from "@/lib/documents/format";

export function DocumentListItem({
    document,
    deleting,
    retrying,
    onDelete,
    onRetry,
}: {
    document: DocumentRow;
    deleting: boolean;
    retrying: boolean;
    onDelete: () => void;
    onRetry: () => void;
}) {
    const [previewing, setPreviewing] = useState(false);

    return (
        <li className="py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                    {document.storage_path ? (
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => setPreviewing(!previewing)}
                            aria-expanded={previewing}
                            className="h-auto max-w-full justify-start truncate p-0 text-sm font-medium text-ink"
                        >
                            {document.title}
                        </Button>
                    ) : (
                        <p className="truncate text-sm font-medium">
                            {document.title}
                        </p>
                    )}
                    <p className="doc-ref mt-1">
                        {document.file_name} ·{" "}
                        {formatFileSize(document.file_size)} ·{" "}
                        {new Date(document.created_at).toLocaleDateString(
                            "vi-VN",
                        )}
                    </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                    <DocumentStatusBadge status={document.status} />
                    <DeleteDocumentDialog
                        document={document}
                        pending={deleting}
                        onConfirm={onDelete}
                    />
                </div>
            </div>

            {previewing && document.storage_path && (
                <DocumentPreview
                    document={document}
                    onClose={() => setPreviewing(false)}
                />
            )}

            <DocumentFailure
                document={document}
                retrying={retrying}
                onRetry={onRetry}
            />
        </li>
    );
}
