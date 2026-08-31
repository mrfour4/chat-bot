"use client";

import { useMemo } from "react";

import { ConversationList } from "@/components/history/conversation-list";
import { HistoryToolbar } from "@/components/history/history-toolbar";
import { useConversations } from "@/hooks/use-conversations";

export function HistoryPanel() {
    const history = useConversations();

    const actions = useMemo(
        () => ({ rename: history.rename, remove: history.remove }),
        [history.rename, history.remove],
    );

    return (
        <>
            <HistoryToolbar
                search={history.search}
                searching={history.searching}
                onSearchChange={history.onSearchChange}
            />

            <ConversationList
                conversations={history.conversations}
                loading={history.loading}
                settling={history.searching}
                filtered={history.search.length > 0}
                hasMore={history.hasMore}
                loadingMore={history.loadingMore}
                pendingId={history.pendingId}
                actions={actions}
                onLoadMore={history.loadMore}
            />
        </>
    );
}
