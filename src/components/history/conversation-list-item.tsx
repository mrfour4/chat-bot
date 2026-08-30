import Link from "next/link";
import { useTranslations } from "next-intl";

import type { ConversationSummary } from "@/lib/chat/conversations";

export function ConversationListItem({
    conversation,
}: {
    conversation: ConversationSummary;
}) {
    const t = useTranslations("history");
    const tc = useTranslations("conversation");

    return (
        <li>
            <Link
                href={`/chat/${conversation.id}`}
                className="flex items-baseline justify-between gap-4 py-4 transition-colors hover:bg-panel"
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
        </li>
    );
}
