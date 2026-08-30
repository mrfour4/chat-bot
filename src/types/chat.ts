import type { Citation } from "@/lib/db";

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
    id: string;
    role: ChatRole;
    content: string;
    citations: Citation[];
    grounded: boolean;
};

export type HistoryTurn = { role: ChatRole; content: string };

export type ChatResponse = {
    answer: string;
    citations: Citation[];
    grounded: boolean;
    reason: string;
    /** Present only for a signed-in user; guests are never persisted. */
    conversationId: string | null;
};
