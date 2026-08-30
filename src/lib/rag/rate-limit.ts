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

export function resetRateLimit(): void {
    hits.clear();
}
