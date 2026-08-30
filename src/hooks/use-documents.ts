"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { DOCUMENTS_POLL_INTERVAL_MS } from "@/constants/documents";
import {
    deleteDocument,
    fetchDocuments,
    requestReindex,
    retryDocument,
    uploadDocument,
} from "@/lib/api/documents";
import type { DocumentRow } from "@/lib/db";
import { isPending, isStale } from "@/lib/documents/status";
import { notifyError, notifySuccess } from "@/lib/notify";
import { queryKeys } from "@/lib/query/keys";

/**
 * Everything the documents page does to the server.
 *
 * Lifted out of the panel so the component renders and the hook decides. It
 * also puts the three mutations, their toasts and the sweeper nudge next to one
 * another, where an inconsistency between them is visible.
 */
export function useDocuments(initial: DocumentRow[]) {
    const queryClient = useQueryClient();
    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: queryKeys.documents });

    // Remounts the upload form after a successful upload, which is what clears
    // the chosen file. Clearing inside the form on submit would throw the
    // selection away before we know the upload succeeded.
    const [uploadFormKey, setUploadFormKey] = useState(0);

    const { data: documents = [] } = useQuery({
        queryKey: queryKeys.documents,
        queryFn: fetchDocuments,
        // Keeps the server-rendered first paint; without it the list would
        // blank on hydration and fill in a moment later.
        initialData: initial,
        // Polls only while something is genuinely in flight, then stops.
        refetchInterval: (query) =>
            (query.state.data ?? []).some((doc) => isPending(doc.status))
                ? DOCUMENTS_POLL_INTERVAL_MS
                : false,
    });

    const upload = useMutation({
        mutationFn: uploadDocument,
        onSuccess: (document) => {
            setUploadFormKey((key) => key + 1);
            notifySuccess(
                "Đã tải lên",
                `“${document.title}” đang được lập chỉ mục. Bạn có thể rời khỏi trang.`,
            );
            return invalidate();
        },
        onError: (error) => notifyError("Tải lên thất bại", error.message),
    });

    const remove = useMutation({
        mutationFn: deleteDocument,
        onSuccess: () => {
            notifySuccess("Đã xoá tài liệu");
            return invalidate();
        },
        onError: (error) =>
            notifyError("Không xoá được tài liệu", error.message),
    });

    const retry = useMutation({
        mutationFn: retryDocument,
        onSuccess: () => {
            notifySuccess("Đang lập chỉ mục lại");
            return invalidate();
        },
        onError: (error) => notifyError("Không thử lại được", error.message),
    });

    /**
     * Nudges the sweeper when something has been in flight too long.
     *
     * `after()` is a promise on a process that may not survive, so a crashed
     * worker would leave a row at "Đang lập chỉ mục" forever -- work in
     * progress that is not in progress. This turns that into a delay, and it
     * costs no scheduling infrastructure: the page that shows the stuck row is
     * the one that asks for it to be re-driven.
     */
    useEffect(() => {
        if (!documents.some((doc) => isStale(doc))) return;

        requestReindex()
            .then(invalidate)
            .catch(() => {
                // A failed nudge is not worth showing: the row already says
                // what state it is in, and the next poll will try again.
            });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [documents]);

    return {
        documents,
        uploadFormKey,
        uploading: upload.isPending,
        deletingId: remove.isPending ? (remove.variables ?? null) : null,
        retryingId: retry.isPending ? (retry.variables ?? null) : null,
        upload: upload.mutate,
        remove: remove.mutate,
        retry: retry.mutate,
    };
}
