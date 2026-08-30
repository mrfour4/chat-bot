import type { GroundingMetadata } from "@google/genai";

/**
 * What the assistant says when the documents do not answer the question.
 *
 * One sentence, no hedging, no offer to guess. A student should be able to tell
 * instantly that this is not an answer, so they go and ask a person.
 */
export const REFUSAL =
    "Không có thông tin trong tài liệu tuyển sinh hiện có. " +
    "Bạn hãy liên hệ trực tiếp với nhà trường để được giải đáp chính xác.";

export type GroundingReason = "ok" | "no-metadata" | "no-chunks" | "empty-text";

export type GroundingCheck = {
    grounded: boolean;
    /** The model's text, or the refusal. Never a mixture. */
    answer: string;
    reason: GroundingReason;
};

function refuse(reason: GroundingReason): GroundingCheck {
    return { grounded: false, answer: REFUSAL, reason };
}

/**
 * The guarantee behind the whole product: an answer with no retrieved source is
 * discarded, whatever it says.
 *
 * Note what this deliberately does NOT do: inspect the text for signs of
 * invention. That is unreliable and unfalsifiable. Instead it checks for
 * *evidence that retrieval happened* and treats the absence as disqualifying.
 * An answer without a source is not an answer, however plausible it reads.
 *
 * Fails closed: every unexpected shape returns the refusal. There is no input
 * for which this returns ungrounded model text.
 */
export function enforceGrounding(input: {
    text: string | undefined;
    groundingMetadata: GroundingMetadata | undefined;
}): GroundingCheck {
    if (!input.groundingMetadata) {
        // Seen in practice: under quota pressure the model can answer without
        // running the retrieval tool at all (2.1.5).
        return refuse("no-metadata");
    }

    const chunks = input.groundingMetadata.groundingChunks;
    if (!chunks || chunks.length === 0) {
        return refuse("no-chunks");
    }

    const answer = input.text?.trim();
    if (!answer) {
        // Retrieval worked but the model said nothing. An empty bubble reads as a
        // bug; the refusal at least tells the student where they stand.
        return refuse("empty-text");
    }

    return { grounded: true, answer, reason: "ok" };
}
