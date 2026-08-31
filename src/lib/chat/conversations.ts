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

export type ConversationPage = {
    conversations: ConversationSummary[];
    nextCursor: MessageCursor | null;
};

function escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export async function listConversationPage(
    supabase: ChatClient,
    input: {
        search?: string;
        before?: MessageCursor | null;
        limit: number;
    },
): Promise<ConversationPage> {
    let builder = supabase.from("conversations").select("*, messages(count)");

    if (input.before) {
        builder = builder.or(
            `created_at.lt.${input.before.createdAt},` +
                `and(created_at.eq.${input.before.createdAt},` +
                `id.lt.${input.before.id})`,
        );
    }

    const search = input.search?.trim();
    if (search) {
        builder = builder.ilike("title", `%${escapeLike(search)}%`);
    }

    const { data, error } = await builder
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(input.limit + 1);

    if (error) throw error;

    const rows = data ?? [];
    const hasMore = rows.length > input.limit;
    const page = hasMore ? rows.slice(0, input.limit) : rows;
    const oldest = page.at(-1);

    return {
        conversations: page.map(({ messages, ...conversation }) => ({
            ...conversation,
            messageCount: messages?.[0]?.count ?? 0,
        })),
        nextCursor:
            hasMore && oldest
                ? { createdAt: oldest.created_at, id: oldest.id }
                : null,
    };
}

export async function renameConversation(
    supabase: ChatClient,
    id: string,
    title: string,
): Promise<void> {
    const { error } = await supabase
        .from("conversations")
        .update({ title })
        .eq("id", id);

    if (error) throw error;
}

export async function deleteConversation(
    supabase: ChatClient,
    id: string,
): Promise<void> {
    const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", id);

    if (error) throw error;
}

export type MessageCursor = { createdAt: string; id: string };

export type MessagePage = {
    messages: Message[];
    nextCursor: MessageCursor | null;
};

export function encodeCursor(cursor: MessageCursor): string {
    return `${cursor.createdAt},${cursor.id}`;
}

export function decodeCursor(value: string | null): MessageCursor | null {
    if (!value) return null;

    const separator = value.lastIndexOf(",");
    if (separator < 1) return null;

    const createdAt = value.slice(0, separator);
    const id = value.slice(separator + 1);

    return createdAt && id ? { createdAt, id } : null;
}

export async function listMessagesPage(
    supabase: ChatClient,
    conversationId: string,
    input: { before?: MessageCursor | null; limit: number },
): Promise<MessagePage> {
    let builder = supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId);

    if (input.before) {
        builder = builder.or(
            `created_at.lt.${input.before.createdAt},` +
                `and(created_at.eq.${input.before.createdAt},` +
                `id.lt.${input.before.id})`,
        );
    }

    const { data, error } = await builder
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(input.limit + 1);

    if (error) throw error;

    const rows = data ?? [];
    const hasMore = rows.length > input.limit;
    const page = hasMore ? rows.slice(0, input.limit) : rows;
    const oldest = page.at(-1);

    return {
        messages: page.reverse(),
        nextCursor:
            hasMore && oldest
                ? { createdAt: oldest.created_at, id: oldest.id }
                : null,
    };
}
