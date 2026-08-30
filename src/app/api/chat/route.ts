import { NextResponse } from "next/server";

import { apiMessages } from "@/lib/api/messages";
import { z } from "zod";

import type { Content } from "@google/genai";

import { getSessionUser } from "@/lib/auth";
import {
    appendMessage,
    createConversation,
    deriveConversationTitle,
} from "@/lib/chat/conversations";
import { resolveCitationTitles } from "@/lib/documents/titles";
import { askDocuments } from "@/lib/rag/ask";
import { checkRateLimit } from "@/lib/rag/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { MAX_QUESTION_LENGTH } from "@/lib/validation/chat";

const MAX_HISTORY_TURNS = 6;

const bodySchema = z.object({
    question: z.string().trim().min(1).max(MAX_QUESTION_LENGTH),
    conversationId: z.string().uuid().optional(),
    history: z
        .array(
            z.object({
                role: z.enum(["user", "assistant"]),
                content: z.string().max(4000),
            }),
        )
        .max(50)
        .optional(),
});

function callerKey(request: Request): string {
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "local"
    );
}

export async function POST(request: Request) {
    const t = await apiMessages();
    const limit = checkRateLimit(callerKey(request));
    if (!limit.allowed) {
        return NextResponse.json(
            {
                code: "rate-limited",
                message: t("rateLimited", {
                    seconds: limit.retryAfterSeconds,
                }),
            },
            {
                status: 429,
                headers: { "Retry-After": String(limit.retryAfterSeconds) },
            },
        );
    }

    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
        return NextResponse.json(
            { code: "invalid-request", message: t("invalidQuestion") },
            { status: 400 },
        );
    }

    const { question, history = [] } = parsed.data;

    const contents: Content[] = history
        .slice(-MAX_HISTORY_TURNS)
        .map((turn) => ({
            role: turn.role === "assistant" ? "model" : "user",
            parts: [{ text: turn.content }],
        }));

    const answered = await askDocuments(question, contents);
    const result = {
        ...answered,
        citations: await resolveCitationTitles(answered.citations),
    };

    const conversationId = await persist({
        question,
        result,
        conversationId: parsed.data.conversationId,
    });

    return NextResponse.json({ ...result, conversationId });
}

async function persist(input: {
    question: string;
    result: Awaited<ReturnType<typeof askDocuments>>;
    conversationId?: string;
}): Promise<string | null> {
    const user = await getSessionUser();
    if (!user) return null;

    try {
        const supabase = await createClient();

        const conversationId =
            input.conversationId ??
            (
                await createConversation(supabase, {
                    userId: user.id,
                    title: deriveConversationTitle(input.question),
                })
            ).id;

        await appendMessage(supabase, {
            conversationId,
            role: "user",
            content: input.question,
        });

        await appendMessage(supabase, {
            conversationId,
            role: "assistant",
            content: input.result.answer,
            citations: input.result.citations,
        });

        return conversationId;
    } catch (error) {
        console.error("[chat] failed to persist conversation:", error);
        return null;
    }
}
