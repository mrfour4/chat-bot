"use client";

import { useEffect, useRef } from "react";

import { useMessageScroller } from "@/components/ui/message-scroller";

export function RestoreScrollOnPrepend({
    messageId,
}: {
    messageId: string | null;
}) {
    const { scrollToMessage } = useMessageScroller();
    const handled = useRef<string | null>(null);

    useEffect(() => {
        if (!messageId || handled.current === messageId) return;
        handled.current = messageId;

        const frame = window.requestAnimationFrame(() => {
            scrollToMessage(messageId, { align: "start" });
        });

        return () => window.cancelAnimationFrame(frame);
    }, [messageId, scrollToMessage]);

    return null;
}
