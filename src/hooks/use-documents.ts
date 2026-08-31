"use client";

import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslations } from "next-intl";

import {
    DOCUMENTS_PAGE_SIZE,
    DOCUMENTS_POLL_INTERVAL_MS,
    SEARCH_DEBOUNCE_MS,
} from "@/constants/documents";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useDocumentsRealtime } from "@/hooks/use-documents-realtime";
import { useRefreshDocuments } from "@/hooks/use-refresh-documents";
import {
    archiveDocument,
    deleteDocument,
    fetchDocumentsPage,
    renameDocument,
    retryDocument,
    unarchiveDocument,
    uploadDocuments,
    type DocumentsPage,
} from "@/lib/api/documents";
import { isPending } from "@/lib/documents/status";
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
    onSettled: () => void,
) {
    const t = useTranslations("documents");

    return useMutation({
        mutationFn: run,
        onSuccess: () => {
            notifySuccess(t(successKey));
            onSettled();
        },
        onError: (error: Error) => notifyError(t(failureKey), error.message),
    });
}

export function useDocuments() {
    const t = useTranslations("documents");

    const refresh = useRefreshDocuments();
    const live = useDocumentsRealtime(refresh);

    const [uploadFormKey, setUploadFormKey] = useState(0);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState<DocumentsStatusFilter>("all");
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState(DOCUMENTS_PAGE_SIZE);

    const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
    const queryInput = { search: debouncedSearch, status, page, pageSize };

    const {
        data = EMPTY_PAGE,
        isPending: firstLoad,
        isFetching,
    } = useQuery({
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

            refresh();
        },
        onError: (error) => notifyError(t("uploadFailed"), error.message),
    });

    const remove = useReportingMutation(
        deleteDocument,
        "deletedTitle",
        "deleteFailed",
        refresh,
    );
    const retry = useReportingMutation(
        retryDocument,
        "reindexingTitle",
        "retryFailed",
        refresh,
    );
    const rename = useReportingMutation(
        renameDocument,
        "renamedTitle",
        "renameFailed",
        refresh,
    );
    const archive = useReportingMutation(
        archiveDocument,
        "archivedTitle",
        "archiveFailed",
        refresh,
    );
    const restore = useReportingMutation(
        unarchiveDocument,
        "restoredTitle",
        "restoreFailed",
        refresh,
    );

    const changeFilter =
        <T>(set: (value: T) => void) =>
        (value: T) => {
            set(value);
            setPage(0);
        };

    const settling = search !== debouncedSearch;

    return {
        documents: data.documents,
        total: data.total,
        loading: firstLoad,
        searching: settling || (isFetching && !firstLoad),

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
