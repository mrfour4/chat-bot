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

/**
 * Answers one question from the uploaded admissions documents.
 *
 * All three grounding layers meet here (§5.7): only the `fileSearch` tool is
 * offered, the system instruction sets the rules, and `enforceGrounding` has
 * the final say over what is returned.
 *
 * `history` lets a follow-up question resolve pronouns against what came
 * before. It is passed to the model but never used as a source: retrieval runs
 * on every turn, so an answer can only ever be grounded in documents, never in
 * something the assistant said earlier.
 */
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
                // Layer 1. `googleSearch` is never added here, deliberately: it would
                // let the model answer from the open web and the citations would still
                // look correct.
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
            // Citations only accompany an answer we are actually returning. Attaching
            // sources to a refusal would imply we found something.
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
