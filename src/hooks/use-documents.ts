"use client";

import {
    keepPreviousData,
    useMutation,
    useQuery,
    useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import {
    DOCUMENTS_PAGE_SIZE,
    DOCUMENTS_POLL_INTERVAL_MS,
    SEARCH_DEBOUNCE_MS,
} from "@/constants/documents";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDocumentsRealtime } from "@/hooks/use-documents-realtime";
import {
    archiveDocument,
    deleteDocument,
    fetchDocumentsPage,
    renameDocument,
    requestReindex,
    retryDocument,
    unarchiveDocument,
    uploadDocuments,
    type DocumentsPage,
} from "@/lib/api/documents";
import { isPending, isStale } from "@/lib/documents/status";
import type { DocumentDisplayStatus } from "@/lib/documents/status";
import { notifyError, notifySuccess } from "@/lib/notify";
import { queryKeys } from "@/lib/query/keys";

export type DocumentsStatusFilter = DocumentDisplayStatus | "all";

const EMPTY_PAGE: DocumentsPage = {
    documents: [],
    total: 0,
    page: 0,
    pageSize: DOCUMENTS_PAGE_SIZE,
};

function useReportingMutation<TVariables>(
    run: (variables: TVariables) => Promise<unknown>,
    successKey: string,
    failureKey: string,
    onSettled: () => Promise<void>,
) {
    const t = useTranslations("documents");

    return useMutation({
        mutationFn: run,
        onSuccess: () => {
            notifySuccess(t(successKey));
            return onSettled();
        },
        onError: (error: Error) => notifyError(t(failureKey), error.message),
    });
}

export function useDocuments() {
    const t = useTranslations("documents");
    const queryClient = useQueryClient();
    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: queryKeys.documents });

    const live = useDocumentsRealtime(invalidate);

    const [uploadFormKey, setUploadFormKey] = useState(0);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<DocumentsStatusFilter>("all");
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(DOCUMENTS_PAGE_SIZE);

    const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
    const queryInput = { search: debouncedSearch, status, page, pageSize };

    const { data = EMPTY_PAGE, isPlaceholderData } = useQuery({
        queryKey: queryKeys.documentsPage(queryInput),
        queryFn: () => fetchDocumentsPage(queryInput),
        placeholderData: keepPreviousData,

        refetchInterval: (query) =>
            !live &&
            (query.state.data?.documents ?? []).some((document) =>
                isPending(document.status),
            )
                ? DOCUMENTS_POLL_INTERVAL_MS
                : false,
    });

    const upload = useMutation({
        mutationFn: uploadDocuments,
        onSuccess: (results) => {
            setUploadFormKey((key) => key + 1);

            const queued = results.filter(
                (result) => result.outcome === "queued",
            ).length;
            const refused = results.length - queued;

            if (queued > 0) {
                notifySuccess(
                    t("uploadedTitle", { count: queued }),
                    t("uploadedDescription", { count: queued }),
                );
            }

            if (refused > 0) {
                notifyError(
                    t("uploadRefused", { count: refused }),
                    results
                        .filter((result) => result.outcome !== "queued")
                        .map(
                            (result) =>
                                `${result.fileName}: ${result.message ?? ""}`,
                        )
                        .join("\n"),
                );
            }

            return invalidate();
        },
        onError: (error) => notifyError(t("uploadFailed"), error.message),
    });

    const remove = useReportingMutation(
        deleteDocument,
        "deletedTitle",
        "deleteFailed",
        invalidate,
    );
    const retry = useReportingMutation(
        retryDocument,
        "reindexingTitle",
        "retryFailed",
        invalidate,
    );
    const rename = useReportingMutation(
        renameDocument,
        "renamedTitle",
        "renameFailed",
        invalidate,
    );
    const archive = useReportingMutation(
        archiveDocument,
        "archivedTitle",
        "archiveFailed",
        invalidate,
    );
    const restore = useReportingMutation(
        unarchiveDocument,
        "restoredTitle",
        "restoreFailed",
        invalidate,
    );

    useEffect(() => {
        if (!data.documents.some((document) => isStale(document))) return;

        requestReindex()
            .then(invalidate)
            .catch(() => {});
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data]);

    const changeFilter =
        <T>(set: (value: T) => void) =>
        (value: T) => {
            set(value);
            setPage(0);
        };

    return {
        documents: data.documents,
        total: data.total,
        loading: isPlaceholderData,

        search,
        onSearchChange: changeFilter(setSearch),
        status,
        onStatusChange: changeFilter(setStatus),

        page,
        pageSize,
        onPageChange: setPage,
        onPageSizeChange: changeFilter(setPageSize),

        uploadFormKey,
        uploading: upload.isPending,
        upload: upload.mutate,

        pendingId:
            (remove.isPending ? remove.variables : null) ??
            (archive.isPending ? archive.variables : null) ??
            (restore.isPending ? restore.variables : null) ??
            (retry.isPending ? retry.variables : null) ??
            (rename.isPending ? rename.variables?.id : null) ??
            null,

        remove: remove.mutate,
        retry: retry.mutate,
        rename: rename.mutate,
        archive: archive.mutate,
        restore: restore.mutate,
        renaming: rename.isPending,
    };
}
