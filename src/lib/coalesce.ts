export type Coalesced = (() => void) & { cancel: () => void };

export function coalesce(run: () => void, windowMs: number): Coalesced {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
        if (timer) clearTimeout(timer);

        timer = setTimeout(() => {
            timer = null;
            run();
        }, windowMs);
    };

    schedule.cancel = () => {
        if (timer) clearTimeout(timer);
        timer = null;
    };

    return schedule;
}
