"use client";

import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/documents/format";

export function SelectedFiles({
    files,
    disabled,
    onRemove,
}: {
    files: File[];
    disabled: boolean;
    onRemove: (index: number) => void;
}) {
    const t = useTranslations("documents");

    if (files.length === 0) return null;

    return (
        <ul className="mt-3 flex flex-col gap-1.5">
            {files.map((file, index) => (
                <li
                    key={`${file.name}-${file.size}-${index}`}
                    className="flex items-center gap-2 rounded-md border border-rule bg-paper px-3 py-1.5"
                >
                    <span className="min-w-0 flex-1 truncate text-sm">
                        {file.name}
                    </span>
                    <span className="doc-ref shrink-0">
                        {formatFileSize(file.size)}
                    </span>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={disabled}
                        onClick={() => onRemove(index)}
                        aria-label={t("removeFile", { name: file.name })}
                        className="shrink-0 text-ink-soft"
                    >
                        <XIcon />
                    </Button>
                </li>
            ))}
        </ul>
    );
}
