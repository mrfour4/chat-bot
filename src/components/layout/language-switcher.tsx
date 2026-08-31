"use client";

import { LanguagesIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LOCALES, LOCALE_LABELS, isLocale } from "@/constants/i18n";
import { setLocale } from "@/i18n/actions";

export function LanguageSwitcher() {
    const locale = useLocale();
    const t = useTranslations("nav");
    const [pending, startTransition] = useTransition();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("language")}
                        disabled={pending}
                        className="shrink-0 text-ink-soft"
                    >
                        <LanguagesIcon />
                    </Button>
                }
            />
            <DropdownMenuContent align="end" className="w-auto">
                <DropdownMenuGroup>
                    <DropdownMenuRadioGroup
                        value={locale}
                        onValueChange={(next) => {
                            if (!isLocale(next) || next === locale) return;
                            startTransition(() => setLocale(next));
                        }}
                    >
                        {LOCALES.map((option) => (
                            <DropdownMenuRadioItem key={option} value={option}>
                                {LOCALE_LABELS[option]}
                            </DropdownMenuRadioItem>
                        ))}
                    </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
