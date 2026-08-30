import { SUGGESTED_QUESTIONS } from "@/constants/chat";
import { Button } from "@/components/ui/button";

export function SuggestionList({
    disabled,
    onSelect,
}: {
    disabled: boolean;
    onSelect: (suggestion: string) => void;
}) {
    return (
        <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((suggestion) => (
                <Button
                    key={suggestion}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => onSelect(suggestion)}
                    className="rounded-full text-ink-soft"
                >
                    {suggestion}
                </Button>
            ))}
        </div>
    );
}
