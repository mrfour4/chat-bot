import { describe, expect, it } from "vitest";

import { prependMessages } from "@/lib/chat/merge";
import type { ChatMessage } from "@/types/chat";

function message(id: string): ChatMessage {
    return {
        id,
        role: "user",
        content: `tin nhắn ${id}`,
        citations: [],
        grounded: true,
    };
}

const ids = (messages: ChatMessage[]) => messages.map((entry) => entry.id);

describe("prependMessages", () => {
    it("puts an older page in front", () => {
        const merged = prependMessages(
            [message("c"), message("d")],
            [message("a"), message("b")],
        );

        expect(ids(merged)).toEqual(["a", "b", "c", "d"]);
    });

    it("drops a page that has already been prepended", () => {
        const current = [message("a"), message("b"), message("c")];
        const merged = prependMessages(current, [message("a"), message("b")]);

        expect(ids(merged)).toEqual(["a", "b", "c"]);
    });

    it("returns the same array when there is nothing new", () => {
        const current = [message("a")];
        expect(prependMessages(current, [message("a")])).toBe(current);
    });

    it("keeps a partial overlap without repeating the shared ones", () => {
        const merged = prependMessages(
            [message("b"), message("c")],
            [message("a"), message("b")],
        );

        expect(ids(merged)).toEqual(["a", "b", "c"]);
    });

    it("deduplicates within the incoming page itself", () => {
        const merged = prependMessages(
            [message("c")],
            [message("a"), message("a"), message("b")],
        );

        expect(ids(merged)).toEqual(["a", "b", "c"]);
    });
});
