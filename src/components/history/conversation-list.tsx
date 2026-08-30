import { ConversationListItem } from "@/components/history/conversation-list-item";
import { HistoryEmpty } from "@/components/history/history-empty";
import type { ConversationSummary } from "@/lib/chat/conversations";

export function ConversationList({
    conversations,
}: {
    conversations: ConversationSummary[];
}) {
    if (conversations.length === 0) return <HistoryEmpty />;

    return (
        <ul className="mt-8 divide-y divide-rule border-y border-rule">
            {conversations.map((conversation) => (
                <ConversationListItem
                    key={conversation.id}
                    conversation={conversation}
                />
            ))}
        </ul>
    );
}
