"use client";

import { useMemo } from "react";

import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { DocumentsPagination } from "@/components/documents/documents-pagination";
import { DocumentsTable } from "@/components/documents/documents-table";
import { DocumentsToolbar } from "@/components/documents/documents-toolbar";
import { useDocuments } from "@/hooks/use-documents";

export function DocumentsPanel() {
    const documents = useDocuments();

    const actions = useMemo(
        () => ({
            rename: documents.rename,
            archive: documents.archive,
            restore: documents.restore,
            retry: documents.retry,
            remove: documents.remove,
        }),
        [
            documents.rename,
            documents.archive,
            documents.restore,
            documents.retry,
            documents.remove,
        ],
    );

    const pageCount = Math.ceil(documents.total / documents.pageSize);

    return (
        <>
            <DocumentUploadForm
                key={documents.uploadFormKey}
                uploading={documents.uploading}
                onUpload={documents.upload}
            />

            <DocumentsToolbar
                search={documents.search}
                onSearchChange={documents.onSearchChange}
                status={documents.status}
                onStatusChange={documents.onStatusChange}
            />

            <DocumentsTable
                documents={documents.documents}
                loading={documents.loading}
                filtered={
                    documents.search.length > 0 || documents.status !== "all"
                }
                pendingId={documents.pendingId}
                actions={actions}
            />

            <DocumentsPagination
                page={documents.page}
                pageCount={pageCount}
                total={documents.total}
                onPageChange={documents.onPageChange}
            />
        </>
    );
}
