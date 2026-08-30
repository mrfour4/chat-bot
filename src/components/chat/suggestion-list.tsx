import { useTranslations } from "next-intl";

import { SUGGESTED_QUESTIONS } from "@/constants/chat";
import { Button } from "@/components/ui/button";

export function SuggestionList({
    disabled,
    onSelect,
}: {
    disabled: boolean;
    onSelect: (suggestion: string) => void;
}) {
    const t = useTranslations("chat");

    return (
        <div className="mb-3 flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((key) => (
                <Button
                    key={key}
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={disabled}
                    onClick={() => onSelect(t(key))}
                    className="rounded-full text-ink-soft"
                >
                    {t(key)}
                </Button>
            ))}
        </div>
    );
}
