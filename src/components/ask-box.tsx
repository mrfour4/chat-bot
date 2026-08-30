"use client";

import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { Citation } from "@/lib/db";
import { CitationList } from "@/components/citation-list";
import { Markdown } from "@/components/markdown";

const SUGGESTIONS = [
    "Có những phương thức xét tuyển nào?",
    "Trường có những ngành nào?",
    "Đối tượng tuyển sinh là ai?",
];

export type ChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    citations: Citation[];
    grounded: boolean;
};

type HistoryTurn = { role: "user" | "assistant"; content: string };

type ChatResponse = {
    answer: string;
    citations: Citation[];
    grounded: boolean;
    reason: string;
    /** Present only for a signed-in user; guests are never persisted. */
    conversationId: string | null;
};

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
    const [question, setQuestion] = useState("");
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

    function ask(text: string) {
        const trimmed = text.trim();
        if (!trimmed || pending) return;

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
                content: trimmed,
                citations: [],
                grounded: true,
            },
        ]);
        setQuestion("");
        send.mutate({ question: trimmed, history });
    }

    return (
        <div>
            {documentCount === 0 && messages.length === 0 && (
                // Asking against an empty store correctly refuses every question, which
                // looks like a broken assistant rather than an empty library. Say which
                // it is before the student spends a question finding out.
                <p
                    role="status"
                    className="mb-6 rounded-md border border-pending/40 bg-panel px-4 py-3 text-sm leading-relaxed"
                >
                    Chưa có tài liệu tuyển sinh nào được tải lên, nên trợ lý
                    chưa thể trả lời câu hỏi nào. Vui lòng quay lại sau.
                </p>
            )}

            {messages.length > 0 && (
                <ol
                    // Answers arrive all at once (§5.15), so there is a single moment to
                    // announce. "polite" waits for a pause rather than cutting in.
                    aria-live="polite"
                    aria-atomic="false"
                    className="mb-6 flex flex-col gap-6"
                >
                    {messages.map((message) =>
                        message.role === "user" ? (
                            <li key={message.id} className="flex justify-end">
                                <p className="max-w-[85%] rounded-lg rounded-br-sm bg-ink px-4 py-2.5 text-sm leading-relaxed text-paper">
                                    {message.content}
                                </p>
                            </li>
                        ) : (
                            <li key={message.id} className="max-w-[92%]">
                                <div
                                    className={`rounded-lg border px-4 py-3 ${
                                        message.grounded
                                            ? "border-rule bg-white"
                                            : // An answer we refused is visually distinct, so it can
                                              // never be mistaken for a quiet, confident reply.
                                              "border-pending/40 bg-panel"
                                    }`}
                                >
                                    <Markdown>{message.content}</Markdown>
                                    <CitationList
                                        citations={message.citations}
                                    />
                                </div>
                            </li>
                        ),
                    )}
                </ol>
            )}

            {pending && (
                <p
                    aria-live="polite"
                    className="mb-6 flex items-center gap-2 text-sm text-ink-soft"
                >
                    <span
                        aria-hidden
                        className="size-3 shrink-0 animate-spin rounded-full border-2 border-rule border-t-ink motion-reduce:animate-none"
                    />
                    {/* We cannot stream the answer (§5.15), so we show the work instead.
              This stage is real, not decorative. */}
                    Đang tìm trong tài liệu tuyển sinh…
                </p>
            )}

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    ask(question);
                }}
                className="flex items-center gap-2 rounded-lg border border-rule bg-white p-2 transition-colors focus-within:border-ink"
            >
                <input
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    disabled={pending}
                    placeholder="Nhập câu hỏi của bạn…"
                    aria-label="Câu hỏi về tuyển sinh"
                    className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm placeholder:text-ink-soft focus:outline-none"
                />
                <button
                    type="submit"
                    disabled={pending || !question.trim()}
                    className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                    Hỏi
                </button>
            </form>

            {send.error && (
                <p
                    role="alert"
                    className="mt-3 rounded-md border border-lacquer/30 bg-lacquer-soft px-3 py-2 text-sm text-lacquer"
                >
                    {send.error.message}
                </p>
            )}

            {messages.length === 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                    {SUGGESTIONS.map((suggestion) => (
                        <button
                            key={suggestion}
                            type="button"
                            disabled={pending}
                            onClick={() => ask(suggestion)}
                            className="rounded-full border border-rule px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
                        >
                            {suggestion}
                        </button>
                    ))}
                </div>
            )}

            <div ref={endRef} />
        </div>
    );
}
