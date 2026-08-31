"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { useMessageScrollerScrollable } from "@/components/ui/message-scroller";
import { Spinner } from "@/components/ui/spinner";

export function OlderMessagesTrigger({
    loading,
    onReach,
}: {
    loading: boolean;
    onReach: () => void;
}) {
    const t = useTranslations("chat");
    const { start } = useMessageScrollerScrollable();

    // `start` is false once there is nothing left to scroll towards, which is
    // the moment the reader has arrived at the oldest loaded message.
    useEffect(() => {
        if (!start) onReach();
    }, [start, onReach]);

    return (
        <p className="doc-ref flex items-center justify-center gap-2 py-2">
            {loading && <Spinner />}
            {loading ? t("loadingOlder") : t("olderAbove")}
        </p>
    );
}
