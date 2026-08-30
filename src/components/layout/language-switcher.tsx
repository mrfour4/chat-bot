"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LOCALES, LOCALE_LABELS } from "@/constants/i18n";
import { setLocale } from "@/i18n/actions";

/**
 * Two languages, so a toggle group rather than a select: both options are
 * visible and switching is one click instead of two.
 *
 * The choice is written to a cookie by a server action, which then revalidates
 * the layout -- every page renders its own strings on the server, so the whole
 * tree has to be rebuilt, not just this control.
 */
export function LanguageSwitcher() {
    const locale = useLocale();
    const t = useTranslations("nav");
    const [pending, startTransition] = useTransition();

    return (
        <ToggleGroup
            aria-label={t("language")}
            value={[locale]}
            onValueChange={(value) => {
                const next = value[0];
                // Base UI reports an empty array when the active item is
                // clicked again. Ignoring it keeps a language always selected.
                if (!next || next === locale) return;
                startTransition(() => setLocale(next));
            }}
            disabled={pending}
            className="hidden sm:flex"
        >
            {LOCALES.map((option) => (
                <ToggleGroupItem
                    key={option}
                    value={option}
                    aria-label={LOCALE_LABELS[option]}
                    className="doc-ref px-2"
                >
                    {option.toUpperCase()}
                </ToggleGroupItem>
            ))}
        </ToggleGroup>
    );
}
