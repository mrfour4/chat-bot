"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import type { DocumentListItem } from "@/lib/documents/repo";
import { formatFileSize } from "@/lib/documents/format";

export function DocumentNameCell({ document }: { document: DocumentListItem }) {
    const t = useTranslations("documents");

    return (
        <div className="min-w-0">
            {document.storage_path ? (
                <a
                    href={`/api/documents/${document.id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={document.title}
                    aria-label={t("openDocument", { title: document.title })}
                    className="group flex min-w-0 items-center gap-1.5 text-sm font-medium text-ink underline-offset-4 hover:underline"
                >
                    <span className="truncate">{document.title}</span>
                    <ExternalLinkIcon
                        aria-hidden
                        className="size-3.5 shrink-0 text-ink-soft opacity-0 transition-opacity group-hover:opacity-100"
                    />
                </a>
            ) : (
                <p
                    title={document.title}
                    className="truncate text-sm font-medium"
                >
                    {document.title}
                </p>
            )}

            <p className="doc-ref mt-1">{formatFileSize(document.file_size)}</p>
        </div>
    );
}
