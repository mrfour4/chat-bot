import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import {
    deleteConversation,
    listConversationPage,
    renameConversation,
    type MessageCursor,
} from "@/lib/chat/conversations";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * No Gemini. Here because the keyset predicate and the ilike escaping are
 * PostgREST filter strings, and only PostgREST can say whether they are right.
 */
const admin = createAdminClient();
const ids = Array.from({ length: 60 }, () => randomUUID());

afterAll(async () => {
    await admin.from("conversations").delete().in("id", ids);
});

describe("listConversationPage", () => {
    it("pages backwards over 60 conversations without gaps or repeats", async () => {
        const { data: user } = await admin
            .from("profiles")
            .select("id")
            .limit(1)
            .single();
        expect(user, "no profile to own the conversations").toBeTruthy();

        const base = Date.parse("2026-08-31T00:00:00.000Z");
        const { error } = await admin.from("conversations").insert(
            ids.map((id, index) => ({
                id,
                user_id: user!.id,
                // Pairs share a timestamp, as several conversations started in
                // the same second would.
                created_at: new Date(
                    base + Math.floor(index / 2) * 1000,
                ).toISOString(),
                title: `ZZLịch sử ${index}`,
            })),
        );
        expect(error).toBeNull();

        const seen: string[] = [];
        let cursor: MessageCursor | null | undefined;
        let pages = 0;

        do {
            const page = await listConversationPage(admin, {
                search: "ZZLịch sử",
                before: cursor,
                limit: 25,
            });

            seen.push(...page.conversations.map((c) => c.title ?? ""));
            cursor = page.nextCursor;
            pages += 1;
            expect(pages, "paging did not terminate").toBeLessThan(10);
        } while (cursor);

        expect(pages).toBe(3);
        expect(seen).toHaveLength(60);
        expect(new Set(seen).size, "a conversation appeared twice").toBe(60);
    });

    it("treats a percent sign in the search as a literal", async () => {
        const literal = await listConversationPage(admin, {
            search: "%",
            limit: 25,
        });

        for (const conversation of literal.conversations) {
            expect(conversation.title).toContain("%");
        }
    });

    it("counts the messages that would go with a delete", async () => {
        const page = await listConversationPage(admin, {
            search: "ZZLịch sử 5",
            limit: 5,
        });

        expect(page.conversations.length).toBeGreaterThan(0);
        expect(page.conversations[0].messageCount).toBe(0);
    });

    it("renames and deletes through the same client the routes use", async () => {
        const id = ids[0];

        await renameConversation(admin, id, "ZZĐã đổi tên");
        const renamed = await listConversationPage(admin, {
            search: "ZZĐã đổi tên",
            limit: 5,
        });
        expect(renamed.conversations[0]?.id).toBe(id);

        await deleteConversation(admin, id);
        const gone = await listConversationPage(admin, {
            search: "ZZĐã đổi tên",
            limit: 5,
        });
        expect(gone.conversations).toHaveLength(0);
    });
});
