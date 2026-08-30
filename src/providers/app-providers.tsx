"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/toast";

function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 60_000,
                retry: 1,
            },
        },
    });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
    if (typeof window === "undefined") return makeQueryClient();
    browserQueryClient ??= makeQueryClient();
    return browserQueryClient;
}

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <QueryClientProvider client={getQueryClient()}>
            <Toaster>{children}</Toaster>
        </QueryClientProvider>
    );
}
