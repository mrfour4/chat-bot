"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import { DOCUMENTS_REFRESH_WINDOW_MS } from "@/constants/documents";
import { coalesce } from "@/lib/coalesce";
import { queryKeys } from "@/lib/query/keys";

export function useRefreshDocuments() {
    const queryClient = useQueryClient();

    const refresh = useMemo(
        () =>
            coalesce(() => {
                void queryClient.invalidateQueries({
                    queryKey: queryKeys.documents,
                });
            }, DOCUMENTS_REFRESH_WINDOW_MS),
        [queryClient],
    );

    useEffect(() => refresh.cancel, [refresh]);

    return refresh;
}
