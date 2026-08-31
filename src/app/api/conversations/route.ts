import { NextResponse } from "next/server";

import { apiMessages } from "@/lib/api/messages";
import { CONVERSATIONS_PAGE_SIZE } from "@/constants/chat";
import { getSessionUser } from "@/lib/auth";
import {
    decodeCursor,
    encodeCursor,
    listConversationPage,
} from "@/lib/chat/conversations";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const t = await apiMessages();
    const user = await getSessionUser();

    if (!user) {
        return NextResponse.json(
            { code: "unauthenticated", message: t("unauthenticated") },
            { status: 401 },
        );
    }

    const url = new URL(request.url);
    const supabase = await createClient();

    const page = await listConversationPage(supabase, {
        search: url.searchParams.get("q") ?? undefined,
        before: decodeCursor(url.searchParams.get("before")),
        limit: CONVERSATIONS_PAGE_SIZE,
    });

    return NextResponse.json({
        conversations: page.conversations,
        nextCursor: page.nextCursor ? encodeCursor(page.nextCursor) : null,
    });
}
