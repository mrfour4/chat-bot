"use client";

import { DocumentListItem } from "@/components/documents/document-list-item";
import { DocumentsEmpty } from "@/components/documents/documents-empty";
import type { DocumentRow } from "@/lib/db";

export function DocumentList({
    documents,
    deletingId,
    retryingId,
    onDelete,
    onRetry,
}: {
    documents: DocumentRow[];
    deletingId: string | null;
    retryingId: string | null;
    onDelete: (id: string) => void;
    onRetry: (id: string) => void;
}) {
    if (documents.length === 0) return <DocumentsEmpty />;

    return (
        <ul className="mt-8 divide-y divide-rule border-y border-rule">
            {documents.map((document) => (
                <DocumentListItem
                    key={document.id}
                    document={document}
                    deleting={deletingId === document.id}
                    retrying={retryingId === document.id}
                    onDelete={() => onDelete(document.id)}
                    onRetry={() => onRetry(document.id)}
                />
            ))}
        </ul>
    );
}
