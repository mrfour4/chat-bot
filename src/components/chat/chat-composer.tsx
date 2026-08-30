"use client";

import { useState } from "react";

import { ChatError } from "@/components/chat/chat-error";
import { SuggestionList } from "@/components/chat/suggestion-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Fixed to the viewport rather than to the end of the conversation: it is the
 * one control on this page, and scrolling up to re-read an answer should not
 * take it away. Centred on the same measure as the messages, so the column does
 * not shift between them.
 */
export function ChatComposer({
    pending,
    error,
    showSuggestions,
    onAsk,
}: {
    pending: boolean;
    error: string | null;
    showSuggestions: boolean;
    onAsk: (question: string) => void;
}) {
    const [question, setQuestion] = useState("");

    function submit(text: string) {
        const trimmed = text.trim();
        if (!trimmed || pending) return;
        setQuestion("");
        onAsk(trimmed);
    }

    return (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper/90 backdrop-blur">
            <div className="mx-auto w-full max-w-2xl px-5 py-4">
                {error && <ChatError message={error} />}

                {showSuggestions && (
                    <SuggestionList disabled={pending} onSelect={submit} />
                )}

                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        submit(question);
                    }}
                    className="flex items-center gap-2 rounded-lg border border-rule bg-white p-2 transition-colors focus-within:border-ink"
                >
                    <Input
                        value={question}
                        onChange={(event) => setQuestion(event.target.value)}
                        disabled={pending}
                        placeholder="Nhập câu hỏi của bạn…"
                        aria-label="Câu hỏi về tuyển sinh"
                        className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
                    />
                    <Button
                        type="submit"
                        disabled={pending || !question.trim()}
                        className="shrink-0"
                    >
                        Hỏi
                    </Button>
                </form>

                <p className="eyebrow mt-2.5 justify-center text-center">
                    Trả lời chỉ dựa trên tài liệu tuyển sinh đã tải lên
                </p>
            </div>
        </div>
    );
}
