import "server-only";

import type { Content } from "@google/genai";

import type { Citation } from "@/lib/db";
import { getFileSearchStore, getGemini } from "@/lib/gemini/client";
import { classifyGeminiError } from "@/lib/gemini/errors";
import { serverEnv } from "@/lib/env";
import { extractCitations } from "@/lib/rag/citations";
import { enforceGrounding, type GroundingReason } from "@/lib/rag/grounding";
import { SYSTEM_INSTRUCTION } from "@/lib/rag/system-instruction";

export type AskResult = {
    answer: string;
    citations: Citation[];
    grounded: boolean;
    reason: GroundingReason | "error";
};

export async function askDocuments(
    question: string,
    history: Content[] = [],
): Promise<AskResult> {
    const contents: Content[] = [
        ...history,
        { role: "user", parts: [{ text: question }] },
    ];

    try {
        const response = await getGemini().models.generateContent({
            model: serverEnv().geminiModel,
            contents,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,

                tools: [
                    {
                        fileSearch: {
                            fileSearchStoreNames: [getFileSearchStore()],
                        },
                    },
                ],
            },
        });

        const candidate = response.candidates?.[0];
        const check = enforceGrounding({
            text: response.text,
            groundingMetadata: candidate?.groundingMetadata,
        });

        return {
            answer: check.answer,

            citations: check.grounded
                ? extractCitations(candidate?.groundingMetadata)
                : [],
            grounded: check.grounded,
            reason: check.reason,
        };
    } catch (error) {
        const failure = classifyGeminiError(error);
        console.error(`[ask] ${failure.kind}: ${failure.detail}`);

        return {
            answer: failure.message,
            citations: [],
            grounded: false,
            reason: "error",
        };
    }
}
