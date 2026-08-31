"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

import { SearchInput } from "@/components/common";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { DocumentsStatusFilter } from "@/hooks/use-documents";
import { DOCUMENT_DISPLAY_STATUSES } from "@/lib/documents/status";

const STATUS_KEYS: Record<string, string> = {
    all: "statusAll",
    uploading: "statusUploading",
    indexing: "statusIndexing",
    ready: "statusReady",
    archived: "statusArchived",
    failed: "statusFailed",
    deleted: "statusDeleted",
};

export function DocumentsToolbar({
    search,
    searching,
    onSearchChange,
    status,
    onStatusChange,
}: {
    search: string;
    searching: boolean;
    onSearchChange: (value: string) => void;
    status: DocumentsStatusFilter;
    onStatusChange: (value: DocumentsStatusFilter) => void;
}) {
    const t = useTranslations("documents");

    const options = useMemo(
        () => ["all", ...DOCUMENT_DISPLAY_STATUSES] as const,
        [],
    );

    const labels = useMemo(
        () =>
            Object.fromEntries(
                options.map((value) => [value, t(STATUS_KEYS[value])]),
            ),
        [options, t],
    );

    return (
        <div className="mt-8 flex flex-wrap items-center gap-3">
            <SearchInput
                value={search}
                searching={searching}
                placeholder={t("searchPlaceholder")}
                label={t("searchLabel")}
                className="min-w-56 flex-1"
                onChange={onSearchChange}
            />

            <Select
                items={labels}
                value={status}
                onValueChange={(value) =>
                    onStatusChange(value as DocumentsStatusFilter)
                }
            >
                <SelectTrigger
                    className="h-9 min-w-40"
                    aria-label={t("filterLabel")}
                >
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        {options.map((value) => (
                            <SelectItem key={value} value={value}>
                                {labels[value]}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    );
}
