import { CitationList } from "@/components/chat/citation-list";
import { Markdown } from "@/components/chat/markdown";
import type { ChatMessage } from "@/types/chat";
import { cn } from "@/lib/utils";

export function AnswerMessage({ message }: { message: ChatMessage }) {
    return (
        <li className="max-w-[92%]">
            <div
                className={cn(
                    "rounded-lg border px-4 py-3",
                    message.grounded
                        ? "border-rule bg-white"
                        : "border-pending/40 bg-panel",
                )}
            >
                <Markdown>{message.content}</Markdown>
                <CitationList citations={message.citations} />
            </div>
        </li>
    );
}
