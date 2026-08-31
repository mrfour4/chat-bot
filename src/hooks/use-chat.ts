"use client";

import { useMutation } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import { askQuestion, fetchOlderMessages } from "@/lib/api/chat";
import { notifyError } from "@/lib/notify";
import type { ChatMessage, HistoryTurn } from "@/types/chat";

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

export function useChat({
    initialMessages,
    initialConversationId,
    initialCursor = null,
}: {
    initialMessages: ChatMessage[];
    initialConversationId: string | null;
    initialCursor?: string | null;
}) {
    const t = useTranslations("chat");
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [conversationId, setConversationId] = useState<string | null>(
        initialConversationId,
    );

    const [cursor, setCursor] = useState<string | null>(initialCursor);

    const send = useMutation({
        mutationFn: (payload: { question: string; history: HistoryTurn[] }) =>
            askQuestion({ ...payload, conversationId }),
        onSuccess: (result) => {
            if (
                result.conversationId &&
                result.conversationId !== conversationId
            ) {
                setConversationId(result.conversationId);

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

        onError: (error) => notifyError(t("askFailed"), error.message),
    });

    const older = useMutation({
        mutationFn: fetchOlderMessages,
        onSuccess: (page) => {
            setCursor(page.nextCursor);
            setMessages((current) => [...page.messages, ...current]);
        },
        onError: (error) => notifyError(t("loadOlderFailed"), error.message),
    });

    const pending = send.isPending;

    const olderMutate = older.mutate;
    const olderPending = older.isPending;

    const loadOlder = useCallback(() => {
        if (!conversationId || !cursor || olderPending) return;
        olderMutate({ conversationId, before: cursor });
    }, [conversationId, cursor, olderPending, olderMutate]);

    function ask(question: string) {
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
        hasOlder: Boolean(conversationId && cursor),
        loadingOlder: older.isPending,
        loadOlder,
        ask,
    };
}
