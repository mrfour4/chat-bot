import type { SupabaseClient } from "@supabase/supabase-js";

import type { Citation, Conversation, Database, Message } from "@/lib/db";

/**
 * Conversation storage for signed-in users.
 *
 * As in `documents/repo.ts`, the client is injected: these always run as the
 * user, so the `conversations_all_own` and `messages_all_own` policies decide
 * what is visible. A guest never reaches this module at all -- their
 * conversation lives in component state and ends with the tab.
 */
export type ChatClient = SupabaseClient<Database>;

type MessageInsert = Database["public"]["Tables"]["messages"]["Insert"];

/** A title short enough for a list, taken from the question that started it. */
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
    // jsonb. An empty array rather than null keeps reads uniform, so nothing
    // downstream has to tell "no sources" apart from "never written".
    citations: (input.citations ?? []) as unknown as MessageInsert["citations"],
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
