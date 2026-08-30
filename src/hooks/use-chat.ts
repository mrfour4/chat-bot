"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { askQuestion } from "@/lib/api/chat";
import { notifyError } from "@/lib/notify";
import type { ChatMessage, HistoryTurn } from "@/types/chat";

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

    const pending = send.isPending;

    useEffect(() => {
        if (messages.length > 0 || pending) {
            endRef.current?.scrollIntoView({
                behavior: scrollBehavior(),
                block: "end",
            });
        }
    }, [messages, pending]);

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
        endRef,
        ask,
    };
}
