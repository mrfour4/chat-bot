import { AnswerMessage } from "@/components/chat/answer-message";
import { QuestionMessage } from "@/components/chat/question-message";
import type { ChatMessage } from "@/types/chat";

export function MessageList({ messages }: { messages: ChatMessage[] }) {
    if (messages.length === 0) return null;

    return (
        <ol
            // Answers arrive all at once (§5.15), so there is a single moment to
            // announce. "polite" waits for a pause rather than cutting in.
            aria-live="polite"
            aria-atomic="false"
            className="flex flex-col gap-6"
        >
            {messages.map((message) =>
                message.role === "user" ? (
                    <QuestionMessage
                        key={message.id}
                        content={message.content}
                    />
                ) : (
                    <AnswerMessage key={message.id} message={message} />
                ),
            )}
        </ol>
    );
}
