"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

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

export function useDocuments(initial: DocumentRow[]) {
    const t = useTranslations("documents");
    const queryClient = useQueryClient();
    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: queryKeys.documents });

    const [uploadFormKey, setUploadFormKey] = useState(0);

    const { data: documents = [] } = useQuery({
        queryKey: queryKeys.documents,
        queryFn: fetchDocuments,

        initialData: initial,

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
                t("uploadedTitle"),
                t("uploadedDescription", { title: document.title }),
            );
            return invalidate();
        },
        onError: (error) => notifyError(t("uploadFailed"), error.message),
    });

    const remove = useMutation({
        mutationFn: deleteDocument,
        onSuccess: () => {
            notifySuccess(t("deletedTitle"));
            return invalidate();
        },
        onError: (error) => notifyError(t("deleteFailed"), error.message),
    });

    const retry = useMutation({
        mutationFn: retryDocument,
        onSuccess: () => {
            notifySuccess(t("reindexingTitle"));
            return invalidate();
        },
        onError: (error) => notifyError(t("retryFailed"), error.message),
    });

    useEffect(() => {
        if (!documents.some((doc) => isStale(doc))) return;

        requestReindex()
            .then(invalidate)
            .catch(() => {});
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
