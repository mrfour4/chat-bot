import Link from "next/link";

import { CitationList } from "@/components/citation-list";
import { Markdown } from "@/components/markdown";
import { requireUser } from "@/lib/auth";
import {
  listConversations,
  listMessages,
} from "@/lib/chat/conversations";
import { parseCitations } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Lịch sử · Cố vấn Tuyển sinh" };

export default async function HistoryPage() {
  // Signed-in only. RLS then narrows to this user's own rows, so the page
  // cannot show someone else's conversation even if the guard were wrong.
  await requireUser();
  const supabase = await createClient();

  const conversations = await listConversations(supabase);
  const withMessages = await Promise.all(
    conversations.map(async (conversation) => ({
      conversation,
      messages: await listMessages(supabase, conversation.id),
    })),
  );

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 md:py-16">
      <div className="border-b border-rule pb-6">
        <p className="eyebrow">Của bạn</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">
          Lịch sử hỏi đáp
        </h1>
      </div>

      {withMessages.length === 0 ? (
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
        <ol className="mt-8 flex flex-col gap-10">
          {withMessages.map(({ conversation, messages }) => (
            <li key={conversation.id}>
              <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-2">
                <h2 className="truncate font-display text-lg font-medium">
                  {conversation.title ?? "Cuộc hỏi đáp"}
                </h2>
                <span className="doc-ref shrink-0">
                  {new Date(conversation.created_at).toLocaleDateString("vi-VN")}
                </span>
              </div>

              <ol className="mt-4 flex flex-col gap-4">
                {messages.map((message) => (
                  <li key={message.id}>
                    {message.role === "user" ? (
                      <p className="text-sm font-medium">{message.content}</p>
                    ) : (
                      <div className="rounded-lg border border-rule bg-white px-4 py-3">
                        <Markdown>{message.content}</Markdown>
                        <CitationList
                          citations={parseCitations(message.citations)}
                        />
                      </div>
                    )}
                  </li>
                ))}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
