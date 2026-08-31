"use client";

import { AnswerMessage } from "@/components/chat/answer-message";
import { OlderMessagesTrigger } from "@/components/chat/older-messages-trigger";
import { QuestionMessage } from "@/components/chat/question-message";
import { RestoreScrollOnPrepend } from "@/components/chat/restore-scroll-on-prepend";
import { ThinkingIndicator } from "@/components/chat/thinking-indicator";
import {
    MessageScroller,
    MessageScrollerButton,
    MessageScrollerContent,
    MessageScrollerItem,
    MessageScrollerProvider,
    MessageScrollerViewport,
} from "@/components/ui/message-scroller";
import type { ChatMessage } from "@/types/chat";

export function MessageList({
    messages,
    pending,
    hasOlder,
    loadingOlder,
    restoreTo,
    onLoadOlder,
}: {
    messages: ChatMessage[];
    pending: boolean;
    hasOlder: boolean;
    loadingOlder: boolean;
    restoreTo: string | null;
    onLoadOlder: () => void;
}) {
    if (messages.length === 0 && !pending) return null;

    return (
        <MessageScrollerProvider autoScroll defaultScrollPosition="end">
            <MessageScroller className="min-h-0 flex-1">
                <MessageScrollerViewport
                    preserveScrollOnPrepend
                    aria-live="polite"
                    aria-atomic="false"
                >
                    <MessageScrollerContent className="mx-auto w-full max-w-2xl gap-6 px-5 py-8">
                        {messages.map((message) => (
                            <MessageScrollerItem
                                key={message.id}
                                messageId={message.id}
                                scrollAnchor={message.role === "user"}
                            >
                                {message.role === "user" ? (
                                    <QuestionMessage
                                        content={message.content}
                                    />
                                ) : (
                                    <AnswerMessage message={message} />
                                )}
                            </MessageScrollerItem>
                        ))}

                        {pending && (
                            <MessageScrollerItem messageId="thinking">
                                <ThinkingIndicator />
                            </MessageScrollerItem>
                        )}
                    </MessageScrollerContent>
                </MessageScrollerViewport>

                <OlderMessagesTrigger
                    hasOlder={hasOlder}
                    loading={loadingOlder}
                    onReach={onLoadOlder}
                />

                <RestoreScrollOnPrepend messageId={restoreTo} />

                <MessageScrollerButton />
            </MessageScroller>
        </MessageScrollerProvider>
    );
}
