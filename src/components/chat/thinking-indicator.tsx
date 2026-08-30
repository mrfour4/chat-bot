import { useTranslations } from "next-intl";

import { Spinner } from "@/components/ui/spinner";

export function ThinkingIndicator() {
    const t = useTranslations("chat");

    return (
        <p
            aria-live="polite"
            className="mt-6 flex items-center gap-2 text-sm text-ink-soft"
        >
            <Spinner className="size-3.5 text-ink-soft motion-reduce:animate-none" />
            {t("thinking")}
        </p>
    );
}
