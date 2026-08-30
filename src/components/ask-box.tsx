"use client";

import { useState } from "react";

const SUGGESTIONS = [
  "Có những phương thức xét tuyển nào?",
  "Học phí năm nay là bao nhiêu?",
  "Hồ sơ đăng ký gồm những giấy tờ gì?",
];

/**
 * Question composer. Phase 1 renders the real input and states plainly that
 * the assistant is not connected yet; phase 2.3 replaces `onSubmit` with the
 * streaming chat call.
 */
export function AskBox() {
  const [question, setQuestion] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (question.trim()) setSubmitted(true);
        }}
        className="flex items-center gap-2 rounded-lg border border-rule bg-white p-2 transition-colors focus-within:border-ink"
      >
        <input
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value);
            setSubmitted(false);
          }}
          placeholder="Nhập câu hỏi của bạn…"
          aria-label="Câu hỏi về tuyển sinh"
          className="min-w-0 flex-1 bg-transparent px-2 py-2 text-sm placeholder:text-ink-soft focus:outline-none"
        />
        <button
          type="submit"
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Hỏi
        </button>
      </form>

      {submitted && (
        <p role="status" className="mt-3 border-l-2 border-lacquer bg-lacquer-soft px-3 py-2 text-sm">
          Trợ lý chưa được kết nối. Phần hỏi đáp sẽ hoạt động sau khi hoàn tất
          bước tích hợp Gemini File Search.
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => {
              setQuestion(suggestion);
              setSubmitted(false);
            }}
            className="rounded-full border border-rule px-3 py-1.5 text-xs text-ink-soft transition-colors hover:border-ink hover:text-ink"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}
