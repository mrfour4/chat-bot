import type { GroundingMetadata } from "@google/genai";

export const REFUSAL =
    "Không có thông tin trong tài liệu tuyển sinh hiện có. " +
    "Bạn hãy liên hệ trực tiếp với nhà trường để được giải đáp chính xác.";

export type GroundingReason = "ok" | "no-metadata" | "no-chunks" | "empty-text";

export type GroundingCheck = {
    grounded: boolean;

    answer: string;
    reason: GroundingReason;
};

function refuse(reason: GroundingReason): GroundingCheck {
    return { grounded: false, answer: REFUSAL, reason };
}

export function enforceGrounding(input: {
    text: string | undefined;
    groundingMetadata: GroundingMetadata | undefined;
}): GroundingCheck {
    if (!input.groundingMetadata) {
        return refuse("no-metadata");
    }

    const chunks = input.groundingMetadata.groundingChunks;
    if (!chunks || chunks.length === 0) {
        return refuse("no-chunks");
    }

    const answer = input.text?.trim();
    if (!answer) {
        return refuse("empty-text");
    }

    return { grounded: true, answer, reason: "ok" };
}
