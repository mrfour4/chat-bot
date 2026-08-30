"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                // Above zero on purpose: pages here render their first data on the
                // server, and a zero stale time would refetch all of it immediately on
                // hydration, undoing the point of rendering it there.
                staleTime: 60_000,
                retry: 1,
            },
        },
    });
}

let browserQueryClient: QueryClient | undefined;

/**
 * A fresh client per server request, a singleton in the browser.
 *
 * Never a module-scope client: on the server that single instance would be
 * shared across requests, leaking one user's cached documents into another
 * user's page.
 */
function getQueryClient() {
    if (typeof window === "undefined") return makeQueryClient();
    browserQueryClient ??= makeQueryClient();
    return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={getQueryClient()}>
            {children}
        </QueryClientProvider>
    );
}
