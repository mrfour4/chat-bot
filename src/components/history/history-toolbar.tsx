"use client";

import { useTranslations } from "next-intl";

import { SearchInput } from "@/components/common";

export function HistoryToolbar({
    search,
    searching,
    onSearchChange,
}: {
    search: string;
    searching: boolean;
    onSearchChange: (value: string) => void;
}) {
    const t = useTranslations("history");

    return (
        <div className="mt-8">
            <SearchInput
                value={search}
                searching={searching}
                placeholder={t("searchPlaceholder")}
                label={t("searchLabel")}
                onChange={onSearchChange}
            />
        </div>
    );
}
