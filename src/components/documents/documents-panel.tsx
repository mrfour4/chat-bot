"use client";

import { DocumentList } from "@/components/documents/document-list";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { useDocuments } from "@/hooks/use-documents";
import type { DocumentRow } from "@/lib/db";

export function DocumentsPanel({ initial }: { initial: DocumentRow[] }) {
    const {
        documents,
        uploadFormKey,
        uploading,
        deletingId,
        retryingId,
        upload,
        remove,
        retry,
    } = useDocuments(initial);

    return (
        <>
            <DocumentUploadForm
                key={uploadFormKey}
                uploading={uploading}
                onUpload={upload}
            />

            <DocumentList
                documents={documents}
                deletingId={deletingId}
                retryingId={retryingId}
                onDelete={remove}
                onRetry={retry}
            />
        </>
    );
}
