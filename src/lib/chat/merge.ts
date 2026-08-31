import type { ChatMessage } from "@/types/chat";

export function prependMessages(
    current: ChatMessage[],
    incoming: ChatMessage[],
): ChatMessage[] {
    const known = new Set(current.map((message) => message.id));
    const fresh: ChatMessage[] = [];

    for (const message of incoming) {
        if (known.has(message.id)) continue;
        known.add(message.id);
        fresh.push(message);
    }

    return fresh.length === 0 ? current : [...fresh, ...current];
}
