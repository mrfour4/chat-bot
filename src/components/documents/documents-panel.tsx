"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { DocumentList } from "@/components/documents/document-list";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import type { DocumentRow } from "@/lib/db";
import { isPending, isStale } from "@/lib/documents/status";
import { queryKeys } from "@/lib/query/keys";

const POLL_INTERVAL_MS = 3000;

/** Reads the API's Vietnamese message, rather than restating it less usefully. */
async function messageFrom(response: Response, fallback: string) {
    const body = await response.json().catch(() => null);
    return body?.message ?? fallback;
}

async function fetchDocuments(): Promise<DocumentRow[]> {
    const response = await fetch("/api/documents");
    if (!response.ok) {
        throw new Error(
            await messageFrom(response, "Không tải được danh sách."),
        );
    }
    const body: { documents: DocumentRow[] } = await response.json();
    return body.documents;
}

export function DocumentsPanel({ initial }: { initial: DocumentRow[] }) {
    const queryClient = useQueryClient();
    // Remounts the upload form after a successful upload, which is what clears
    // the chosen file. Clearing inside the form on submit would throw the
    // selection away before we know the upload succeeded.
    const [uploadFormKey, setUploadFormKey] = useState(0);
    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: queryKeys.documents });

    const { data: documents = [] } = useQuery({
        queryKey: queryKeys.documents,
        queryFn: fetchDocuments,
        // Keeps the server-rendered first paint; without it the list would blank
        // on hydration and fill in a moment later.
        initialData: initial,
        // Polls only while something is genuinely in flight, then stops.
        refetchInterval: (query) =>
            (query.state.data ?? []).some((doc) => isPending(doc.status))
                ? POLL_INTERVAL_MS
                : false,
    });

    const upload = useMutation({
        mutationFn: async (file: File) => {
            const body = new FormData();
            body.append("file", file);

            const response = await fetch("/api/documents", {
                method: "POST",
                body,
            });
            if (!response.ok) {
                throw new Error(
                    await messageFrom(
                        response,
                        "Tải lên thất bại. Vui lòng thử lại.",
                    ),
                );
            }
            return (await response.json()) as DocumentRow;
        },
        onSuccess: () => {
            setUploadFormKey((key) => key + 1);
            return invalidate();
        },
    });

    const remove = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/documents/${id}`, {
                method: "DELETE",
            });
            if (!response.ok) {
                throw new Error(
                    await messageFrom(response, "Không xoá được tài liệu."),
                );
            }
        },
        onSuccess: invalidate,
    });

    const retry = useMutation({
        mutationFn: async (id: string) => {
            const response = await fetch(`/api/documents/${id}/retry`, {
                method: "POST",
            });
            if (!response.ok) {
                throw new Error(
                    await messageFrom(
                        response,
                        "Không thử lại được. Vui lòng thử lại.",
                    ),
                );
            }
        },
        onSuccess: invalidate,
    });

    /**
     * Nudges the sweeper when something has been in flight too long.
     *
     * `after()` is a promise on a process that may not survive, so a crashed
     * worker would leave a row at "Đang lập chỉ mục" forever -- work in progress
     * that is not in progress. This turns that into a delay, and it costs no
     * scheduling infrastructure: the page that shows the stuck row is the one
     * that asks for it to be re-driven.
     */
    useEffect(() => {
        if (!documents.some((doc) => isStale(doc))) return;

        fetch("/api/documents/reindex", { method: "POST" })
            .then(invalidate)
            .catch(() => {
                // A failed nudge is not worth showing: the row already says what
                // state it is in, and the next poll will try again.
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documents]);

    return (
        <>
            <DocumentUploadForm
                key={uploadFormKey}
                uploading={upload.isPending}
                error={upload.error?.message ?? null}
                onUpload={(file) => upload.mutate(file)}
                onReset={() => upload.reset()}
            />

            <DocumentList
                documents={documents}
                deletingId={
                    remove.isPending ? (remove.variables ?? null) : null
                }
                retryingId={retry.isPending ? (retry.variables ?? null) : null}
                onDelete={(id) => remove.mutate(id)}
                onRetry={(id) => retry.mutate(id)}
            />
        </>
    );
}
