"use client";

import { ChatComposer } from "@/components/chat/chat-composer";
import { EmptyLibraryNotice } from "@/components/chat/empty-library-notice";
import { MessageList } from "@/components/chat/message-list";
import { ThinkingIndicator } from "@/components/chat/thinking-indicator";
import { useChat } from "@/hooks/use-chat";
import type { ChatMessage } from "@/types/chat";

export function AskBox({
    documentCount,
    initialMessages = [],
    initialConversationId = null,
}: {
    documentCount: number;

    initialMessages?: ChatMessage[];
    initialConversationId?: string | null;
}) {
    const { messages, pending, error, endRef, ask } = useChat({
        initialMessages,
        initialConversationId,
    });

    return (
        <div>
            {documentCount === 0 && messages.length === 0 && (
                <EmptyLibraryNotice />
            )}

            <MessageList messages={messages} />

            {pending && <ThinkingIndicator />}

            <div ref={endRef} />

            <div aria-hidden className="h-40" />

            <ChatComposer
                pending={pending}
                error={error}
                showSuggestions={messages.length === 0}
                onAsk={ask}
            />
        </div>
    );
}
