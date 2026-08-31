"use client";

import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";

export function HistoryToolbar({
    search,
    onSearchChange,
}: {
    search: string;
    onSearchChange: (value: string) => void;
}) {
    const t = useTranslations("history");

    return (
        <div className="mt-8">
            <InputGroup>
                <InputGroupAddon>
                    <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                    value={search}
                    onChange={(event) => onSearchChange(event.target.value)}
                    placeholder={t("searchPlaceholder")}
                    aria-label={t("searchLabel")}
                />
            </InputGroup>
        </div>
    );
}
