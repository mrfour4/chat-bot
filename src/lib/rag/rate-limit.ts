/**
 * A small fixed-window limiter for the public chat endpoint.
 *
 * `/api/chat` is reachable without an account and each call spends real Gemini
 * quota -- on the free tier, the entire day's 20 requests could be drained by
 * one script in a second. Some limit is not optional.
 *
 * Deliberately in-memory, and honest about what that means: the counter lives
 * in one server instance, so it does not hold across a horizontally scaled
 * deployment. It stops casual abuse and accidental loops, which is the actual
 * threat for an MVP. A real deployment wants Redis or the platform's own rate
 * limiting, and this is the seam where that goes.
 */
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 8;

const hits = new Map<string, { count: number; resetAt: number }>();

export type RateLimitResult = {
    allowed: boolean;
    retryAfterSeconds: number;
};

export function checkRateLimit(key: string, now = Date.now()): RateLimitResult {
    const entry = hits.get(key);

    if (!entry || now >= entry.resetAt) {
        hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
        return { allowed: true, retryAfterSeconds: 0 };
    }

    entry.count += 1;

    if (entry.count > MAX_REQUESTS) {
        return {
            allowed: false,
            retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
        };
    }

    return { allowed: true, retryAfterSeconds: 0 };
}

/** Only for tests — the window is otherwise self-clearing. */
export function resetRateLimit(): void {
    hits.clear();
}
