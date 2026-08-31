import { NextResponse } from "next/server";

import { apiMessages } from "@/lib/api/messages";
import { MESSAGES_PAGE_SIZE } from "@/constants/chat";
import { getSessionUser } from "@/lib/auth";
import {
    decodeCursor,
    encodeCursor,
    getConversation,
    listMessagesPage,
} from "@/lib/chat/conversations";
import { parseCitations } from "@/lib/db";
import { resolveCitationTitles } from "@/lib/documents/titles";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage } from "@/types/chat";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const t = await apiMessages();
    const user = await getSessionUser();

    if (!user) {
        return NextResponse.json(
            { code: "unauthenticated", message: t("unauthenticated") },
            { status: 401 },
        );
    }

    const { id } = await params;
    const supabase = await createClient();

    // Read through the user's own client, so RLS decides. 404 rather than 403
    // for someone else's conversation: 403 confirms it exists.
    const conversation = await getConversation(supabase, id);
    if (!conversation) {
        return NextResponse.json(
            { code: "not-found", message: t("notFound") },
            { status: 404 },
        );
    }

    const url = new URL(request.url);
    const page = await listMessagesPage(supabase, id, {
        before: decodeCursor(url.searchParams.get("before")),
        limit: MESSAGES_PAGE_SIZE,
    });

    const messages: ChatMessage[] = await Promise.all(
        page.messages.map(async (message) => ({
            id: message.id,
            role:
                message.role === "assistant"
                    ? ("assistant" as const)
                    : ("user" as const),
            content: message.content,
            citations: await resolveCitationTitles(
                parseCitations(message.citations),
            ),
            grounded: true,
        })),
    );

    return NextResponse.json({
        messages,
        nextCursor: page.nextCursor ? encodeCursor(page.nextCursor) : null,
    });
}
