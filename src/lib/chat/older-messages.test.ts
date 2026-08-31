import { describe, expect, it } from "vitest";

import {
    shouldLoadOlder,
    type OlderMessagesInput,
} from "@/lib/chat/older-messages";

const base: OlderMessagesInput = {
    armed: true,
    hasOlder: true,
    loading: false,
    start: false,
    end: true,
    previousStart: true,
};

const decide = (patch: Partial<OlderMessagesInput> = {}) =>
    shouldLoadOlder({ ...base, ...patch });

describe("shouldLoadOlder", () => {
    it("loads when the reader arrives at the top", () => {
        expect(decide()).toBe(true);
    });

    it("waits for the scroller's first real measurement", () => {
        expect(decide({ armed: false, previousStart: null })).toBe(false);
    });

    it("does not load again while a page is on its way", () => {
        expect(decide({ loading: true })).toBe(false);
    });

    it("does not load when there is nothing older", () => {
        expect(decide({ hasOlder: false })).toBe(false);
    });

    it("does not load away from the top", () => {
        expect(decide({ start: true })).toBe(false);
    });

    it("does not load again just because the viewport still reads as the top", () => {
        expect(
            decide({ previousStart: false }),
            "this is the runaway fetch: after a page lands the effect re-runs " +
                "before the scroll position has been restored, so start is " +
                "still false and a state-based check fires again",
        ).toBe(false);
    });

    it("loads again once the reader has left the top and come back", () => {
        expect(decide({ previousStart: false, end: true })).toBe(false);
        expect(decide({ previousStart: true, end: true })).toBe(true);
    });

    it("fills a conversation too short to scroll", () => {
        expect(decide({ previousStart: false, end: false })).toBe(true);
    });
});
