import type { Database, Json } from "@/lib/database.types";

export type { Database } from "@/lib/database.types";

type Tables = Database["public"]["Tables"];
type Enums = Database["public"]["Enums"];

export type Profile = Tables["profiles"]["Row"];
export type DocumentRow = Tables["documents"]["Row"];
export type DocumentInsert = Tables["documents"]["Insert"];
export type Conversation = Tables["conversations"]["Row"];
export type Message = Tables["messages"]["Row"];

export type UserRole = Enums["user_role"];
export type DocumentStatus = Enums["document_status"];

export type Citation = {
    documentId: string | null;
    fileName: string;
    page: number | null;
    snippet: string | null;
};

export function parseCitations(value: Json): Citation[] {
    return Array.isArray(value) ? (value as unknown as Citation[]) : [];
}
