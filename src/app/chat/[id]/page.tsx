import Link from "next/link";
import { notFound } from "next/navigation";

import { AskBox, type ChatMessage } from "@/components/ask-box";
import { requireUser } from "@/lib/auth";
import { getConversation, listMessages } from "@/lib/chat/conversations";
import { parseCitations } from "@/lib/db";
import { listIndexedDocuments } from "@/lib/documents";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Cuộc hỏi đáp · Cố vấn Tuyển sinh" };

export default async function ConversationPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireUser();

    const { id } = await params;
    const supabase = await createClient();

    // RLS scopes this to the signed-in user, so someone else's conversation is
    // simply absent -- and 404 rather than 403 avoids confirming it exists.
    const conversation = await getConversation(supabase, id);
    if (!conversation) notFound();

    const [messages, documents] = await Promise.all([
        listMessages(supabase, id),
        listIndexedDocuments(),
    ]);

    // Stored rows become exactly what the chat holds in state, so a resumed
    // conversation and a live one are the same thing from here on.
    const initialMessages: ChatMessage[] = messages.map((message) => ({
        id: message.id,
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
        citations: parseCitations(message.citations),
        // Persisted answers were grounded when they were written -- the guard in
        // §5.7 is what let them be stored at all.
        grounded: true,
    }));

    return (
        <div className="mx-auto max-w-3xl px-5 py-10 md:py-14">
            <div className="border-b border-rule pb-5">
                <div className="flex items-baseline justify-between gap-4">
                    <p className="eyebrow">Tiếp tục cuộc hỏi đáp</p>
                    <Link
                        href="/"
                        className="doc-ref shrink-0 transition-colors hover:text-ink"
                    >
                        + Cuộc mới
                    </Link>
                </div>
                <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                    {conversation.title ?? "Cuộc hỏi đáp"}
                </h1>
                <p className="mt-1.5 text-sm text-ink-soft">
                    Bắt đầu ngày{" "}
                    {new Date(conversation.created_at).toLocaleDateString(
                        "vi-VN",
                    )}
                </p>
            </div>

            <div className="mt-8">
                <AskBox
                    documentCount={documents.length}
                    initialMessages={initialMessages}
                    initialConversationId={conversation.id}
                />
            </div>

            <Link
                href="/history"
                className="mt-10 inline-block text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
            >
                ← Tất cả cuộc hỏi đáp
            </Link>
        </div>
    );
}
