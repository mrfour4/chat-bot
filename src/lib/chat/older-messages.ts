export type ScrollerEdges = {
    start: boolean;
    end: boolean;
};

export type OlderMessagesInput = ScrollerEdges & {
    armed: boolean;
    hasOlder: boolean;
    loading: boolean;
    previousStart: boolean | null;
};

export function shouldLoadOlder(input: OlderMessagesInput): boolean {
    if (!input.armed || !input.hasOlder || input.loading) return false;
    if (input.start) return false;

    const reachedTop = input.previousStart !== false;
    const cannotScroll = !input.end;

    return reachedTop || cannotScroll;
}
