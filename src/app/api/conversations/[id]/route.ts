import { NextResponse } from "next/server";

import { apiMessages } from "@/lib/api/messages";
import { getSessionUser } from "@/lib/auth";
import {
    deleteConversation,
    getConversation,
    renameConversation,
} from "@/lib/chat/conversations";
import { createClient } from "@/lib/supabase/server";
import { renameConversationSchema } from "@/lib/validation/chat";

async function load(id: string) {
    const t = await apiMessages();
    const user = await getSessionUser();

    if (!user) {
        return {
            error: NextResponse.json(
                { code: "unauthenticated", message: t("unauthenticated") },
                { status: 401 },
            ),
        };
    }

    const supabase = await createClient();

    const conversation = await getConversation(supabase, id);
    if (!conversation) {
        return {
            error: NextResponse.json(
                { code: "not-found", message: t("conversationNotFound") },
                { status: 404 },
            ),
        };
    }

    return { supabase, conversation, t };
}

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const loaded = await load(id);
    if (loaded.error) return loaded.error;

    const payload: unknown = await request.json().catch(() => null);
    const parsed = renameConversationSchema.safeParse(payload);
    if (!parsed.success) {
        return NextResponse.json(
            { code: "invalid-title", message: loaded.t("invalidTitle") },
            { status: 400 },
        );
    }

    await renameConversation(loaded.supabase, id, parsed.data.title);

    return NextResponse.json({
        ...loaded.conversation,
        title: parsed.data.title,
    });
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const { id } = await params;
    const loaded = await load(id);
    if (loaded.error) return loaded.error;

    await deleteConversation(loaded.supabase, id);

    return NextResponse.json({ ok: true });
}
