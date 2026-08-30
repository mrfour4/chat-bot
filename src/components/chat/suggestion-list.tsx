import { Button } from "@/components/ui/button";

const SUGGESTIONS = [
    "Có những phương thức xét tuyển nào?",
    "Trường có những ngành nào?",
    "Đối tượng tuyển sinh là ai?",
];

export function SuggestionList({
    disabled,
    onSelect,
}: {
    disabled: boolean;
    onSelect: (suggestion: string) => void;
}) {
    return (
        <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTIONS.map((suggestion) => (
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
