/**
 * Application-facing names for the database schema.
 *
 * `database.types.ts` is generated output — `npm run db:types` overwrites it
 * wholesale — so nothing hand-written may live there. This file is the stable
 * surface the app imports; if a regeneration breaks something here, that is the
 * schema change announcing itself, which is the point.
 */
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

/**
 * One source reference attached to an assistant answer, derived from Gemini's
 * grounding metadata. Stored in `messages.citations`, which is `jsonb` and so
 * generates as `Json` — narrow it with `parseCitations` at the read boundary.
 */
export type Citation = {
    /** Supabase `documents.id`, when the citation resolves to a known row. */
    documentId: string | null;
    fileName: string;
    page: number | null;
    snippet: string | null;
};

export function parseCitations(value: Json): Citation[] {
    return Array.isArray(value) ? (value as unknown as Citation[]) : [];
}
