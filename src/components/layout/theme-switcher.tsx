"use client";

import { MonitorIcon, MoonIcon, SunIcon, SunMoonIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DEFAULT_THEME, THEMES } from "@/constants/theme";

const ICONS = {
    light: SunIcon,
    dark: MoonIcon,
    system: MonitorIcon,
} as const;

export function ThemeSwitcher() {
    const t = useTranslations("theme");
    const { theme, setTheme } = useTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t("label")}
                        className="shrink-0 text-ink-soft"
                    >
                        <SunMoonIcon />
                    </Button>
                }
            />
            <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                    <DropdownMenuRadioGroup
                        value={theme ?? DEFAULT_THEME}
                        onValueChange={setTheme}
                    >
                        {THEMES.map((option) => {
                            const OptionIcon = ICONS[option];
                            return (
                                <DropdownMenuRadioItem
                                    key={option}
                                    value={option}
                                >
                                    <OptionIcon data-icon="inline-start" />
                                    {t(option)}
                                </DropdownMenuRadioItem>
                            );
                        })}
                    </DropdownMenuRadioGroup>
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
