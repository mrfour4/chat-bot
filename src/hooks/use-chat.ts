"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { askQuestion } from "@/lib/api/chat";
import { notifyError } from "@/lib/notify";
import type { ChatMessage, HistoryTurn } from "@/types/chat";

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

function message(
    role: ChatMessage["role"],
    content: string,
    rest: Partial<ChatMessage> = {},
): ChatMessage {
    return {
        id: crypto.randomUUID(),
        role,
        content,
        citations: [],
        grounded: true,
        ...rest,
    };
}

/**
 * The conversation.
 *
 * `useMutation` for sending, and only for sending: a conversation is
 * append-only client state, not a cache of server state, so there is nothing
 * here to invalidate or refetch. What the mutation gives us is `isPending` and
 * `error` without hand-rolled flags.
 */
export function useChat({
    initialMessages,
    initialConversationId,
}: {
    initialMessages: ChatMessage[];
    initialConversationId: string | null;
}) {
    const t = useTranslations("chat");
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [conversationId, setConversationId] = useState<string | null>(
        initialConversationId,
    );
    const endRef = useRef<HTMLDivElement>(null);

    const send = useMutation({
        mutationFn: (payload: { question: string; history: HistoryTurn[] }) =>
            askQuestion({ ...payload, conversationId }),
        onSuccess: (result) => {
            if (
                result.conversationId &&
                result.conversationId !== conversationId
            ) {
                setConversationId(result.conversationId);

                // Put the conversation in the address bar the moment it exists,
                // so a refresh or a shared link lands back on it.
                // `replaceState` rather than `router.replace`: Next integrates
                // it with the router, and it costs no navigation, no refetch
                // and no remount of a list we are already holding. Replace, not
                // push, because the empty page this started from is not
                // somewhere to go "back" to.
                window.history.replaceState(
                    null,
                    "",
                    `/chat/${result.conversationId}`,
                );
            }

            setMessages((current) => [
                ...current,
                message("assistant", result.answer, {
                    citations: result.citations,
                    grounded: result.grounded,
                }),
            ]);
        },
        // No success toast: the answer appearing *is* the feedback. A failure
        // has no such evidence, so it gets one -- and keeps the inline message
        // too, because a toast expires and a question left unanswered would
        // then look like it had simply been ignored.
        onError: (error) => notifyError(t("askFailed"), error.message),
    });

    const pending = send.isPending;

    // Keeps the newest turn in view as the conversation grows, including while
    // the answer is still forming.
    useEffect(() => {
        if (messages.length > 0 || pending) {
            endRef.current?.scrollIntoView({
                behavior: scrollBehavior(),
                block: "end",
            });
        }
    }, [messages, pending]);

    function ask(question: string) {
        // History is taken before the new question is appended, so the model
        // never sees the current turn twice. It carries only what was said --
        // retrieval re-runs every turn, so the conversation can never become a
        // source.
        const history: HistoryTurn[] = messages.map((entry) => ({
            role: entry.role,
            content: entry.content,
        }));

        setMessages((current) => [...current, message("user", question)]);
        send.mutate({ question, history });
    }

    return {
        messages,
        pending,
        error: send.error?.message ?? null,
        endRef,
        ask,
    };
}
