"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { LOCALES, LOCALE_LABELS } from "@/constants/i18n";
import { setLocale } from "@/i18n/actions";

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
