import type { SupabaseClient } from "@supabase/supabase-js";

import type { Citation, Conversation, Database, Message } from "@/lib/db";

export type ChatClient = SupabaseClient<Database>;

type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];

export function deriveConversationTitle(question: string): string {
    const clean = question.replace(/\s+/g, " ").trim();
    if (clean.length <= 60) return clean;
    return `${clean.slice(0, 59).trimEnd()}…`;
}

export async function createConversation(
    supabase: ChatClient,
    input: { userId: string; title: string },
): Promise<Conversation> {
    const { data, error } = await supabase
        .from("conversations")
        .insert({ user_id: input.userId, title: input.title })
        .select("*")
        .single();

    if (error) throw error;
    return data;
}

export async function appendMessage(
    supabase: ChatClient,
    input: {
        conversationId: string;
        role: "user" | "assistant";
        content: string;
        citations?: Citation[];
    },
): Promise<void> {
    const { error } = await supabase.from("messages").insert({
        conversation_id: input.conversationId,
        role: input.role,
        content: input.content,

        citations: (input.citations ??
            []) as unknown as MessageInsert["citations"],
    });

    if (error) throw error;
}

export async function listConversations(
    supabase: ChatClient,
): Promise<Conversation[]> {
    const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data ?? [];
}

export async function getConversation(
    supabase: ChatClient,
    id: string,
): Promise<Conversation | null> {
    const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error) throw error;
    return data;
}

export type ConversationSummary = Conversation & { messageCount: number };

export async function listConversationSummaries(
    supabase: ChatClient,
): Promise<ConversationSummary[]> {
    const { data, error } = await supabase
        .from("conversations")
        .select("*, messages(count)")
        .order("created_at", { ascending: false });

    if (error) throw error;

    return (data ?? []).map(({ messages, ...conversation }) => ({
        ...conversation,
        messageCount: messages?.[0]?.count ?? 0,
    }));
}

export async function listMessages(
    supabase: ChatClient,
    conversationId: string,
): Promise<Message[]> {
    const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

    if (error) throw error;
    return data ?? [];
}
