import { expectOk } from "@/lib/api/http";
import type { ConversationSummary } from "@/lib/chat/conversations";

export type ConversationPageResponse = {
    conversations: ConversationSummary[];
    nextCursor: string | null;
};

export async function fetchConversations(input: {
    search: string;
    before: string | null;
}): Promise<ConversationPageResponse> {
    const params = new URLSearchParams();
    if (input.search) params.set("q", input.search);
    if (input.before) params.set("before", input.before);

    const response = await expectOk(
        await fetch(`/api/conversations?${params}`),
        "Không tải được lịch sử trò chuyện.",
    );
    return (await response.json()) as ConversationPageResponse;
}

export async function renameConversation(input: {
    id: string;
    title: string;
}): Promise<void> {
    await expectOk(
        await fetch(`/api/conversations/${input.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ title: input.title }),
        }),
        "Không đổi được tên cuộc trò chuyện.",
    );
}

export async function deleteConversation(id: string): Promise<void> {
    await expectOk(
        await fetch(`/api/conversations/${id}`, { method: "DELETE" }),
        "Không xoá được cuộc trò chuyện.",
    );
}
