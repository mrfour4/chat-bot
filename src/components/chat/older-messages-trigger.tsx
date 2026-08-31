"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { useMessageScrollerScrollable } from "@/components/ui/message-scroller";
import { Spinner } from "@/components/ui/spinner";

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
    const { start } = useMessageScrollerScrollable();
    const [armed, setArmed] = useState(false);

    useEffect(() => {
        const frame = window.requestAnimationFrame(() => setArmed(true));
        return () => window.cancelAnimationFrame(frame);
    }, []);

    useEffect(() => {
        if (armed && hasOlder && !start && !loading) onReach();
    }, [armed, hasOlder, start, loading, onReach]);

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
