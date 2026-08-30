import { NextResponse } from "next/server";
import { z } from "zod";

import type { Content } from "@google/genai";

import { getSessionUser } from "@/lib/auth";
import {
    appendMessage,
    createConversation,
    deriveConversationTitle,
} from "@/lib/chat/conversations";
import { askDocuments } from "@/lib/rag/ask";
import { checkRateLimit } from "@/lib/rag/rate-limit";
import { createClient } from "@/lib/supabase/server";

/** Long enough for a real admissions question, short enough to bound cost. */
const MAX_QUESTION_LENGTH = 1000;

/**
 * Only the last few turns are sent back to the model. Enough for a follow-up to
 * resolve "còn chỉ tiêu thì sao?", without letting a long conversation quietly
 * grow every request.
 */
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
    // Vercel and most proxies set these; locally both are absent and every
    // caller shares one bucket, which is fine for a dev machine.
    return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "local"
    );
}

export async function POST(request: Request) {
    const limit = checkRateLimit(callerKey(request));
    if (!limit.allowed) {
        return NextResponse.json(
            {
                code: "rate-limited",
                message: `Bạn đang hỏi hơi nhanh. Vui lòng thử lại sau ${limit.retryAfterSeconds} giây.`,
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
            { code: "invalid-request", message: "Câu hỏi không hợp lệ." },
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

    // askDocuments returns rather than throws, including for quota and outages,
    // so there is no failure here the route has to interpret.
    const result = await askDocuments(question, contents);

    const conversationId = await persist({
        question,
        result,
        conversationId: parsed.data.conversationId,
    });

    return NextResponse.json({ ...result, conversationId });
}

/**
 * Saves the exchange for a signed-in user. Guests keep their conversation in
 * component state and it ends with the tab -- §4 gives history to students, and
 * storing a guest's questions without an account to attach them to would be
 * collecting data we promised not to.
 *
 * Never throws: a storage problem must not turn a good answer into an error the
 * student sees. A lost history entry is a smaller harm than a lost answer.
 */
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
