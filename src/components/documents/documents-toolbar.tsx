"use client";

import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
} from "@/components/ui/input-group";
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
    onSearchChange,
    status,
    onStatusChange,
}: {
    search: string;
    onSearchChange: (value: string) => void;
    status: DocumentsStatusFilter;
    onStatusChange: (value: DocumentsStatusFilter) => void;
}) {
    const t = useTranslations("documents");

    return (
        <div className="mt-8 flex flex-wrap items-center gap-3">
            <InputGroup className="min-w-56 flex-1">
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

            <Select
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
                        {["all", ...DOCUMENT_DISPLAY_STATUSES].map((value) => (
                            <SelectItem key={value} value={value}>
                                {t(STATUS_KEYS[value])}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    );
}
