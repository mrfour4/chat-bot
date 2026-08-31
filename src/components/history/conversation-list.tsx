"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";

import { ConversationListItem } from "@/components/history/conversation-list-item";
import type { ConversationActions } from "@/components/history/conversation-actions-menu";
import { HistoryEmpty } from "@/components/history/history-empty";
import { HistoryNoMatches } from "@/components/history/history-no-matches";
import { HistorySkeleton } from "@/components/history/history-skeleton";
import { Spinner } from "@/components/ui/spinner";
import type { ConversationSummary } from "@/lib/chat/conversations";

const ESTIMATED_ROW_HEIGHT = 82;

const PREFETCH_ROWS = 5;

export function ConversationList({
    conversations,
    loading,
    filtered,
    hasMore,
    loadingMore,
    pendingId,
    actions,
    onLoadMore,
}: {
    conversations: ConversationSummary[];
    loading: boolean;
    filtered: boolean;
    hasMore: boolean;
    loadingMore: boolean;
    pendingId: string | null;
    actions: ConversationActions;
    onLoadMore: () => void;
}) {
    "use no memo";

    const t = useTranslations("history");
    const scrollRef = useRef<HTMLDivElement>(null);

    // eslint-disable-next-line react-hooks/incompatible-library
    const virtualizer = useVirtualizer({
        count: conversations.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => ESTIMATED_ROW_HEIGHT,
        getItemKey: (index) => conversations[index]?.id ?? index,
        overscan: 6,
    });

    const items = virtualizer.getVirtualItems();
    const lastIndex = items.at(-1)?.index ?? 0;

    useEffect(() => {
        if (!hasMore || loadingMore) return;
        if (lastIndex >= conversations.length - PREFETCH_ROWS) onLoadMore();
    }, [hasMore, loadingMore, lastIndex, conversations.length, onLoadMore]);

    if (loading) return <HistorySkeleton />;
    if (conversations.length === 0) {
        return filtered ? <HistoryNoMatches /> : <HistoryEmpty />;
    }

    return (
        <>
            <div
                ref={scrollRef}
                className="mt-6 max-h-[calc(100dvh-22rem)] min-h-80 overflow-y-auto border-t border-rule"
            >
                <div
                    style={{ height: virtualizer.getTotalSize() }}
                    className="relative w-full"
                >
                    {items.map((item) => (
                        <div
                            key={item.key}
                            ref={virtualizer.measureElement}
                            data-index={item.index}
                            style={{ transform: `translateY(${item.start}px)` }}
                            className="absolute inset-x-0 top-0"
                        >
                            <ConversationListItem
                                conversation={conversations[item.index]}
                                pending={
                                    pendingId === conversations[item.index].id
                                }
                                actions={actions}
                            />
                        </div>
                    ))}
                </div>
            </div>

            {loadingMore && (
                <p className="doc-ref mt-3 flex items-center justify-center gap-2">
                    <Spinner />
                    {t("loadingMore")}
                </p>
            )}
        </>
    );
}
