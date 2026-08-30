import Link from "next/link";

import { requireUser } from "@/lib/auth";
import { listConversationSummaries } from "@/lib/chat/conversations";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Lịch sử · Cố vấn Tuyển sinh" };

export default async function HistoryPage() {
  // Signed-in only. RLS then narrows to this user's own rows, so the page
  // cannot show someone else's conversation even if the guard were wrong.
  await requireUser();
  const supabase = await createClient();

  // A list of conversations, not a transcript of all of them. The previous
  // version loaded every message of every conversation to render a heading and
  // a date -- N+1 round trips for data it then mostly ignored.
  const conversations = await listConversationSummaries(supabase);

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 md:py-16">
      <div className="flex items-end justify-between gap-4 border-b border-rule pb-6">
        <div>
          <p className="eyebrow">Của bạn</p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
            Lịch sử hỏi đáp
          </h1>
        </div>
        <Link
          href="/"
          className="shrink-0 rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper transition-opacity hover:opacity-90"
        >
          Đặt câu hỏi mới
        </Link>
      </div>

      {conversations.length === 0 ? (
        <div className="mt-10 rounded-lg border border-dashed border-rule p-10 text-center">
          <p className="font-display text-lg font-medium">Chưa có câu hỏi nào.</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-soft">
            Câu hỏi bạn đặt khi đã đăng nhập sẽ được lưu lại ở đây.
          </p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-md bg-ink px-4 py-2 text-sm font-medium text-paper"
          >
            Đặt câu hỏi
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-rule border-y border-rule">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              {/* The whole row is the link. A title that happens to be short
                  should not leave most of the row unclickable. */}
              <Link
                href={`/chat/${conversation.id}`}
                className="flex items-baseline justify-between gap-4 py-4 transition-colors hover:bg-panel"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {conversation.title ?? "Cuộc hỏi đáp"}
                  </span>
                  <span className="doc-ref mt-1">
                    {conversation.messageCount} tin nhắn
                  </span>
                </span>
                <span className="doc-ref shrink-0">
                  {new Date(conversation.created_at).toLocaleDateString("vi-VN")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
