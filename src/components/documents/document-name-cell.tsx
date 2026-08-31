"use client";

import { useState } from "react";

import { DocumentPreview } from "@/components/documents/document-preview";
import { Button } from "@/components/ui/button";
import type { DocumentListItem } from "@/lib/documents/repo";
import { formatFileSize } from "@/lib/documents/format";

export function DocumentNameCell({ document }: { document: DocumentListItem }) {
    const [previewing, setPreviewing] = useState(false);

    return (
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
                <p className="truncate text-sm font-medium">{document.title}</p>
            )}

            <p className="doc-ref mt-1 truncate">
                {document.file_name} · {formatFileSize(document.file_size)}
            </p>

            {previewing && document.storage_path && (
                <DocumentPreview
                    document={document}
                    onClose={() => setPreviewing(false)}
                />
            )}
        </div>
    );
}
