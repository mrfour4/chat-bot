import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { AskBox } from "@/components/chat";
import { Button } from "@/components/ui/button";
import type { ChatMessage } from "@/types/chat";
import { requireUser } from "@/lib/auth";
import {
    encodeCursor,
    getConversation,
    listMessagesPage,
} from "@/lib/chat/conversations";
import { parseCitations } from "@/lib/db";
import { MESSAGES_PAGE_SIZE } from "@/constants/chat";
import { listIndexedDocuments } from "@/lib/documents";
import { resolveCitationTitles } from "@/lib/documents/titles";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata() {
    const t = await getTranslations();
    return { title: `${t("conversation.metaTitle")} · ${t("common.appName")}` };
}

export default async function ConversationPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    await requireUser();
    const t = await getTranslations("conversation");

    const { id } = await params;
    const supabase = await createClient();

    const conversation = await getConversation(supabase, id);
    if (!conversation) notFound();

    const [page, documents] = await Promise.all([
        listMessagesPage(supabase, id, { limit: MESSAGES_PAGE_SIZE }),
        listIndexedDocuments(),
    ]);

    const initialMessages: ChatMessage[] = await Promise.all(
        page.messages.map(async (message) => ({
            id: message.id,
            role:
                message.role === "assistant"
                    ? ("assistant" as const)
                    : ("user" as const),
            content: message.content,
            citations: await resolveCitationTitles(
                parseCitations(message.citations),
            ),

            grounded: true,
        })),
    );

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="mx-auto w-full max-w-2xl shrink-0 border-b border-rule px-5 pt-8 pb-5">
                <div className="flex items-baseline justify-between gap-4">
                    <p className="eyebrow">{t("eyebrow")}</p>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="doc-ref shrink-0"
                        render={<Link href="/">{t("new")}</Link>}
                    />
                </div>
                <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                    {conversation.title ?? t("untitled")}
                </h1>
                <p className="mt-1.5 text-sm text-ink-soft">
                    {t("startedOn", {
                        date: new Date(
                            conversation.created_at,
                        ).toLocaleDateString(),
                    })}
                </p>
            </div>

            <AskBox
                documentCount={documents.length}
                initialMessages={initialMessages}
                initialConversationId={conversation.id}
                initialCursor={
                    page.nextCursor ? encodeCursor(page.nextCursor) : null
                }
            />
        </div>
    );
}
