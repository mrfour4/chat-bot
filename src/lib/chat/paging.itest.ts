import { randomUUID } from "node:crypto";

import { afterAll, describe, expect, it } from "vitest";

import {
    encodeCursor,
    listMessagesPage,
    type MessageCursor,
} from "@/lib/chat/conversations";
import { createAdminClient } from "@/lib/supabase/admin";

const admin = createAdminClient();
const conversationId = randomUUID();
const TOTAL = 60;

afterAll(async () => {
    await admin.from("conversations").delete().eq("id", conversationId);
});

describe("listMessagesPage", () => {
    it("walks a conversation backwards without skipping or repeating", async () => {
        const { data: user } = await admin
            .from("profiles")
            .select("id")
            .limit(1)
            .single();
        expect(user, "no profile to own the conversation").toBeTruthy();

        await admin.from("conversations").insert({
            id: conversationId,
            user_id: user!.id,
            title: "Phân trang",
        });

        const base = Date.parse("2026-08-31T00:00:00.000Z");
        const rows = Array.from({ length: TOTAL }, (_, index) => ({
            id: randomUUID(),
            conversation_id: conversationId,
            role: index % 2 === 0 ? "user" : "assistant",
            content: `tin nhắn ${index}`,
            citations: [],
            created_at: new Date(
                base + Math.floor(index / 2) * 1000,
            ).toISOString(),
        }));

        const { error } = await admin.from("messages").insert(rows);
        expect(error).toBeNull();

        const seen: string[] = [];
        let cursor: MessageCursor | null | undefined;
        let pages = 0;

        do {
            const page = await listMessagesPage(admin, conversationId, {
                before: cursor,
                limit: 25,
            });

            expect(page.messages.length).toBeLessThanOrEqual(25);
            seen.unshift(...page.messages.map((message) => message.content));

            cursor = page.nextCursor;
            pages += 1;
            expect(pages, "paging did not terminate").toBeLessThan(10);
        } while (cursor);

        expect(pages).toBe(3);
        expect(seen).toHaveLength(TOTAL);
        expect(new Set(seen).size, "a message was returned twice").toBe(TOTAL);

        expect(seen[0]).toBe("tin nhắn 0");
        expect(seen.at(-1)).toBe(`tin nhắn ${TOTAL - 1}`);
    });

    it("reports no cursor once the conversation is exhausted", async () => {
        const page = await listMessagesPage(admin, conversationId, {
            before: null,
            limit: TOTAL + 10,
        });

        expect(page.messages).toHaveLength(TOTAL);
        expect(page.nextCursor).toBeNull();
    });

    it("encodes a cursor the route can read back", () => {
        expect(
            encodeCursor({ createdAt: "2026-08-31T00:00:00Z", id: "abc" }),
        ).toBe("2026-08-31T00:00:00Z,abc");
    });
});
