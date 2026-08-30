import Link from "next/link";

import type { ConversationSummary } from "@/lib/chat/conversations";

export function ConversationListItem({
    conversation,
}: {
    conversation: ConversationSummary;
}) {
    return (
        <li>
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
                    {new Date(conversation.created_at).toLocaleDateString(
                        "vi-VN",
                    )}
                </span>
            </Link>
        </li>
    );
}
