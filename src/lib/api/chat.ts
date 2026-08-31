import { expectOk } from "@/lib/api/http";
import type { ChatMessage, ChatResponse, HistoryTurn } from "@/types/chat";

export async function askQuestion(payload: {
    question: string;
    history: HistoryTurn[];
    conversationId: string | null;
}): Promise<ChatResponse> {
    const response = await expectOk(
        await fetch("/api/chat", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                question: payload.question,
                history: payload.history,

                ...(payload.conversationId
                    ? { conversationId: payload.conversationId }
                    : {}),
            }),
        }),
        "Không gửi được câu hỏi. Vui lòng thử lại.",
    );

    return (await response.json()) as ChatResponse;
}

export type MessagePageResponse = {
    messages: ChatMessage[];
    nextCursor: string | null;
};

export async function fetchOlderMessages(input: {
    conversationId: string;
    before: string;
}): Promise<MessagePageResponse> {
    const response = await expectOk(
        await fetch(
            `/api/conversations/${input.conversationId}/messages` +
                `?before=${encodeURIComponent(input.before)}`,
        ),
        "Không tải được các tin nhắn cũ hơn.",
    );
    return (await response.json()) as MessagePageResponse;
}
