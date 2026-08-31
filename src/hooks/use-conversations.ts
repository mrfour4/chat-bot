"use client";

import {
    keepPreviousData,
    useInfiniteQuery,
    useMutation,
    useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { SEARCH_DEBOUNCE_MS } from "@/constants/documents";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
    deleteConversation,
    fetchConversations,
    renameConversation,
} from "@/lib/api/conversations";
import { notifyError, notifySuccess } from "@/lib/notify";
import { queryKeys } from "@/lib/query/keys";

export function useConversations() {
    const t = useTranslations("history");
    const queryClient = useQueryClient();
    const invalidate = () =>
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations });

    const [search, setSearch] = useState("");
    const debouncedSearch = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

    const settling = search !== debouncedSearch;

    const query = useInfiniteQuery({
        queryKey: [...queryKeys.conversations, debouncedSearch],
        queryFn: ({ pageParam }) =>
            fetchConversations({
                search: debouncedSearch,
                before: pageParam,
            }),
        initialPageParam: null as string | null,
        getNextPageParam: (page) => page.nextCursor,
        placeholderData: keepPreviousData,
    });

    const conversations = useMemo(
        () => (query.data?.pages ?? []).flatMap((page) => page.conversations),
        [query.data],
    );

    const rename = useMutation({
        mutationFn: renameConversation,
        onSuccess: () => {
            notifySuccess(t("renamedTitle"));
            return invalidate();
        },
        onError: (error) => notifyError(t("renameFailed"), error.message),
    });

    const remove = useMutation({
        mutationFn: deleteConversation,
        onSuccess: () => {
            notifySuccess(t("deletedTitle"));
            return invalidate();
        },
        onError: (error) => notifyError(t("deleteFailed"), error.message),
    });

    const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;

    const loadMore = useCallback(() => {
        if (!hasNextPage || isFetchingNextPage) return;
        void fetchNextPage();
    }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

    return {
        conversations,
        loading: query.isPending,
        searching: settling || (query.isFetching && !query.isPending),
        error: query.error?.message ?? null,

        search,
        onSearchChange: setSearch,

        hasMore: hasNextPage,
        loadingMore: isFetchingNextPage,
        loadMore,

        pendingId:
            (rename.isPending ? rename.variables.id : null) ??
            (remove.isPending ? remove.variables : null) ??
            null,
        rename: rename.mutate,
        remove: remove.mutate,
    };
}
