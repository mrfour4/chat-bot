"use client";

import { useEffect, useRef, useState } from "react";

import type { Citation } from "@/lib/db";
import { CitationList } from "@/components/citation-list";

const SUGGESTIONS = [
  "Có những phương thức xét tuyển nào?",
  "Trường có những ngành nào?",
  "Đối tượng tuyển sinh là ai?",
];

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  grounded: boolean;
};

type ChatResponse = {
  answer: string;
  citations: Citation[];
  grounded: boolean;
  reason: string;
  /** Present only for a signed-in user; guests are never persisted. */
  conversationId: string | null;
};

export function AskBox() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length > 0 || pending) {
      endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, pending]);

  async function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      citations: [],
      grounded: true,
    };

    // History is taken before the new question is appended, and carries only
    // what was said -- the model re-retrieves every turn regardless.
    const history = messages.map((message) => ({
      role: message.role,
      content: message.content,
    }));

    setMessages((current) => [...current, userMessage]);
    setQuestion("");
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: trimmed,
          history,
          // Null for a guest, so the server simply does not persist.
          ...(conversationId ? { conversationId } : {}),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.message ?? "Không gửi được câu hỏi. Vui lòng thử lại.");
        return;
      }

      const result: ChatResponse = await response.json();
      if (result.conversationId) setConversationId(result.conversationId);

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
    } catch {
      setError("Không kết nối được tới máy chủ. Vui lòng kiểm tra mạng và thử lại.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div>
      {messages.length > 0 && (
        <ol className="mb-6 flex flex-col gap-6">
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
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                  <CitationList citations={message.citations} />
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
          void ask(question);
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

      {error && (
        <p
          role="alert"
          className="mt-3 rounded-md border border-lacquer/30 bg-lacquer-soft px-3 py-2 text-sm text-lacquer"
        >
          {error}
        </p>
      )}

      {messages.length === 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={pending}
              onClick={() => void ask(suggestion)}
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
