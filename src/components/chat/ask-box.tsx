"use client";

import { ChatComposer } from "@/components/chat/chat-composer";
import { EmptyLibraryNotice } from "@/components/chat/empty-library-notice";
import { MessageList } from "@/components/chat/message-list";
import { useChat } from "@/hooks/use-chat";
import type { ChatMessage } from "@/types/chat";

export function AskBox({
    documentCount,
    initialMessages = [],
    initialConversationId = null,
    initialCursor = null,
}: {
    documentCount: number;

    initialMessages?: ChatMessage[];
    initialConversationId?: string | null;
    initialCursor?: string | null;
}) {
    const {
        messages,
        pending,
        error,
        hasOlder,
        loadingOlder,
        restoreTo,
        loadOlder,
        ask,
    } = useChat({ initialMessages, initialConversationId, initialCursor });

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {documentCount === 0 && messages.length === 0 && (
                <div className="mx-auto w-full max-w-2xl px-5">
                    <EmptyLibraryNotice />
                </div>
            )}

            <MessageList
                messages={messages}
                pending={pending}
                hasOlder={hasOlder}
                loadingOlder={loadingOlder}
                restoreTo={restoreTo}
                onLoadOlder={loadOlder}
            />

            <ChatComposer
                pending={pending}
                error={error}
                showSuggestions={messages.length === 0}
                onAsk={ask}
            />
        </div>
    );
}
