"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/toast";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DEFAULT_THEME } from "@/constants/theme";

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
        <ThemeProvider
            attribute="class"
            defaultTheme={DEFAULT_THEME}
            enableSystem
            disableTransitionOnChange
        >
            <QueryClientProvider client={getQueryClient()}>
                <TooltipProvider>
                    <Toaster>{children}</Toaster>
                </TooltipProvider>
            </QueryClientProvider>
        </ThemeProvider>
    );
}
