/**
 * Hand-maintained mirror of supabase/migrations. Keep in sync when the schema
 * changes (or swap for `supabase gen types typescript` once the CLI is in use).
 *
 * These are `type` aliases rather than `interface` declarations on purpose:
 * postgrest-js constrains every row to `Record<string, unknown>`, and only type
 * aliases get the implicit index signature that satisfies it. Declaring them as
 * interfaces makes every query resolve to `never`.
 */

export type UserRole = "student" | "teacher";
export type DocumentStatus = "pending" | "indexing" | "ready" | "failed";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
};

export type DocumentRow = {
  id: string;
  title: string;
  file_name: string;
  file_size: number;
  checksum: string | null;
  status: DocumentStatus;
  error_message: string | null;
  gemini_document_name: string | null;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
};

export type Citation = {
  documentId: string | null;
  fileName: string;
  page: number | null;
  snippet: string | null;
};

export type Conversation = {
  id: string;
  user_id: string;
  title: string | null;
  created_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  created_at: string;
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "13" };
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; email: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      documents: {
        Row: DocumentRow;
        Insert: Omit<DocumentRow, "id" | "created_at" | "updated_at"> & { id?: string };
        Update: Partial<DocumentRow>;
        Relationships: [];
      };
      conversations: {
        Row: Conversation;
        Insert: Omit<Conversation, "id" | "created_at"> & { id?: string };
        Update: Partial<Conversation>;
        Relationships: [];
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, "id" | "created_at"> & { id?: string };
        Update: Partial<Message>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_teacher: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: { user_role: UserRole; document_status: DocumentStatus };
    CompositeTypes: Record<string, never>;
  };
};
