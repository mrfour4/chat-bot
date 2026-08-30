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
            {/* We cannot stream the answer (§5.15), so we show the work instead.
                This stage is real, not decorative. */}
            {t("thinking")}
        </p>
    );
}
