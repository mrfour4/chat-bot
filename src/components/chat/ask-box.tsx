"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { ChatComposer } from "@/components/chat/chat-composer";
import { EmptyLibraryNotice } from "@/components/chat/empty-library-notice";
import { MessageList } from "@/components/chat/message-list";
import { ThinkingIndicator } from "@/components/chat/thinking-indicator";
import type {
    ChatMessage,
    ChatResponse,
    HistoryTurn,
} from "@/components/chat/types";
import { notifyError } from "@/lib/notify";

/**
 * Respects the OS "reduce motion" setting.
 *
 * The global CSS neutralises CSS animations, but `scrollIntoView` is JavaScript
 * and ignores it -- and smooth scrolling is exactly the kind of unrequested
 * movement that setting exists to prevent.
 */
function scrollBehavior(): ScrollBehavior {
    return typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth";
}

export function AskBox({
    documentCount,
    initialMessages = [],
    initialConversationId = null,
}: {
    documentCount: number;
    /** A resumed conversation, loaded on the server. Empty for a new one. */
    initialMessages?: ChatMessage[];
    initialConversationId?: string | null;
}) {
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [conversationId, setConversationId] = useState<string | null>(
        initialConversationId,
    );
    const endRef = useRef<HTMLDivElement>(null);

    /**
     * `useMutation` for sending, and only for sending.
     *
     * A conversation is append-only client state, not a cache of server state --
     * there is nothing here to invalidate or refetch, and modelling messages as
     * query data would fight the library rather than use it. What the mutation
     * does give us is `isPending` and `error` without hand-rolled flags.
     */
    const send = useMutation({
        mutationFn: async (payload: {
            question: string;
            history: HistoryTurn[];
        }) => {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                    question: payload.question,
                    history: payload.history,
                    // Absent for a guest, so the server simply does not persist.
                    ...(conversationId ? { conversationId } : {}),
                }),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => null);
                throw new Error(
                    body?.message ??
                        "Không gửi được câu hỏi. Vui lòng thử lại.",
                );
            }

            return (await response.json()) as ChatResponse;
        },
        onSuccess: (result) => {
            if (
                result.conversationId &&
                result.conversationId !== conversationId
            ) {
                setConversationId(result.conversationId);

                // Put the conversation in the address bar the moment it exists, so a
                // refresh or a shared link lands back on it. `replaceState` rather
                // than `router.replace`: Next integrates it with the router, and it
                // costs no navigation, no refetch and no remount of a list we are
                // already holding. Replace, not push, because the empty page this
                // started from is not somewhere to go "back" to.
                window.history.replaceState(
                    null,
                    "",
                    `/chat/${result.conversationId}`,
                );
            }

            setMessages((current) => [
                ...current,
                {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: result.answer,
                    citations: result.citations,
                    grounded: result.grounded,
                },
            ]);
        },
        // No success toast: the answer appearing *is* the feedback, and a toast
        // announcing it would be a second notification of something already on
        // screen. A failure has no such evidence, so it gets one -- and keeps
        // the inline message too, because a toast expires and a question left
        // unanswered would then look like it had simply been ignored.
        onError: (error) =>
            notifyError("Không gửi được câu hỏi", error.message),
    });

    const pending = send.isPending;

    // Declared after `pending` so it can read it. Keeps the newest turn in view
    // as the conversation grows, including while the answer is still forming.
    useEffect(() => {
        if (messages.length > 0 || pending) {
            endRef.current?.scrollIntoView({
                behavior: scrollBehavior(),
                block: "end",
            });
        }
    }, [messages, pending]);

    function ask(question: string) {
        // History is taken before the new question is appended, so the model never
        // sees the current turn twice. It carries only what was said -- retrieval
        // re-runs every turn, so the conversation can never become a source.
        const history: HistoryTurn[] = messages.map((message) => ({
            role: message.role,
            content: message.content,
        }));

        setMessages((current) => [
            ...current,
            {
                id: crypto.randomUUID(),
                role: "user",
                content: question,
                citations: [],
                grounded: true,
            },
        ]);
        send.mutate({ question, history });
    }

    return (
        <div>
            {documentCount === 0 && messages.length === 0 && (
                <EmptyLibraryNotice />
            )}

            <MessageList messages={messages} />

            {pending && <ThinkingIndicator />}

            <div ref={endRef} />

            {/* Clears the fixed composer below, so the newest message is never
                left sitting underneath it. */}
            <div aria-hidden className="h-40" />

            <ChatComposer
                pending={pending}
                error={send.error?.message ?? null}
                showSuggestions={messages.length === 0}
                onAsk={ask}
            />
        </div>
    );
}
