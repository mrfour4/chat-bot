import { cache } from "react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { AskBox } from "@/components/chat";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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

const loadConversation = cache(async (id: string) => {
    const supabase = await createClient();
    return getConversation(supabase, id);
});

export async function generateMetadata({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const t = await getTranslations();
    const { id } = await params;
    const conversation = await loadConversation(id);

    const name = conversation?.title ?? t("conversation.metaTitle");
    return { title: `${name} · ${t("common.appName")}` };
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

    const conversation = await loadConversation(id);
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

    const intro = (
        <div className="pt-4 pb-2 md:pt-8">
            <div className="flex items-baseline justify-between gap-4">
                <p className="eyebrow">{t("eyebrow")}</p>
                <Link
                    href="/"
                    className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        "doc-ref shrink-0",
                    )}
                >
                    {t("new")}
                </Link>
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
    );

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <AskBox
                documentCount={documents.length}
                initialMessages={initialMessages}
                initialConversationId={conversation.id}
                initialCursor={
                    page.nextCursor ? encodeCursor(page.nextCursor) : null
                }
                intro={intro}
            />
        </div>
    );
}
