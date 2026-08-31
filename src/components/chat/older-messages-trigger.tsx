"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { useMessageScrollerScrollable } from "@/components/ui/message-scroller";
import { Spinner } from "@/components/ui/spinner";
import { shouldLoadOlder } from "@/lib/chat/older-messages";

export function OlderMessagesTrigger({
    hasOlder,
    loading,
    onReach,
}: {
    hasOlder: boolean;
    loading: boolean;
    onReach: () => void;
}) {
    const t = useTranslations("chat");
    const { start, end } = useMessageScrollerScrollable();
    const [armed, setArmed] = useState(false);
    const previousStart = useRef<boolean | null>(null);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => setArmed(true));
        return () => window.cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        const previous = previousStart.current;
        previousStart.current = start;

        if (
            shouldLoadOlder({
                armed,
                hasOlder,
                loading,
                start,
                end,
                previousStart: previous,
            })
        ) {
            onReach();
        }
    }, [armed, hasOlder, loading, start, end, onReach]);

    if (!loading) return null;

    return (
        <p
            aria-live="polite"
            className="doc-ref pointer-events-none absolute inset-x-0 top-3 z-10 flex items-center justify-center gap-2"
        >
            <span className="flex items-center gap-2 rounded-full border border-rule bg-surface/95 px-3 py-1 shadow-sm backdrop-blur">
                <Spinner />
                {t("loadingOlder")}
            </span>
        </p>
    );
}
