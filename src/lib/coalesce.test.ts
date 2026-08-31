import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { coalesce } from "@/lib/coalesce";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("coalesce", () => {
    it("turns a burst into one call", () => {
        const run = vi.fn();
        const schedule = coalesce(run, 150);

        schedule();
        schedule();
        schedule();

        vi.advanceTimersByTime(150);
        expect(run).toHaveBeenCalledTimes(1);
    });

    it("runs again for a change that arrives after the window", () => {
        const run = vi.fn();
        const schedule = coalesce(run, 150);

        schedule();
        vi.advanceTimersByTime(150);
        schedule();
        vi.advanceTimersByTime(150);

        expect(run).toHaveBeenCalledTimes(2);
    });

    it("does not run before the window closes", () => {
        const run = vi.fn();
        const schedule = coalesce(run, 150);

        schedule();
        vi.advanceTimersByTime(149);
        expect(run).not.toHaveBeenCalled();
    });

    it("cancels a pending call", () => {
        const run = vi.fn();
        const schedule = coalesce(run, 150);

        schedule();
        schedule.cancel();
        vi.advanceTimersByTime(1000);

        expect(run).not.toHaveBeenCalled();
    });
});
