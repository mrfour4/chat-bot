"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import { ConversationActionsMenu } from "@/components/history/conversation-actions-menu";
import type { ConversationActions } from "@/components/history/conversation-actions-menu";
import type { ConversationSummary } from "@/lib/chat/conversations";

export function ConversationListItem({
    conversation,
    pending,
    actions,
}: {
    conversation: ConversationSummary;
    pending: boolean;
    actions: ConversationActions;
}) {
    const t = useTranslations("history");
    const tc = useTranslations("conversation");

    return (
        <div
            data-busy={pending ? "" : undefined}
            className="flex items-center gap-2 border-b border-rule pr-2 data-busy:opacity-60"
        >
            <Link
                href={`/chat/${conversation.id}`}
                className="flex min-w-0 flex-1 items-baseline justify-between gap-4 py-4 transition-colors hover:bg-panel"
            >
                <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                        {conversation.title ?? tc("untitled")}
                    </span>
                    <span className="doc-ref mt-1">
                        {t("messageCount", {
                            count: conversation.messageCount,
                        })}
                    </span>
                </span>
                <span className="doc-ref shrink-0">
                    {new Date(conversation.created_at).toLocaleDateString(
                        "vi-VN",
                    )}
                </span>
            </Link>

            <ConversationActionsMenu
                conversation={conversation}
                pending={pending}
                actions={actions}
            />
        </div>
    );
}
