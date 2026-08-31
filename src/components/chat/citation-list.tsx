"use client";

import { useTranslations } from "next-intl";
import { ChevronRightIcon } from "lucide-react";

import { CitationEntry } from "@/components/chat/citation-entry";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Citation } from "@/lib/db";

export function CitationList({ citations }: { citations: Citation[] }) {
    const t = useTranslations("chat");

    if (citations.length === 0) return null;

    return (
        <Collapsible className="mt-4 border-t border-rule pt-3">
            <CollapsibleTrigger className="doc-ref group flex cursor-pointer items-center gap-1 transition-colors hover:text-ink">
                <ChevronRightIcon
                    aria-hidden
                    className="size-3.5 transition-transform group-data-[panel-open]:rotate-90 motion-reduce:transition-none"
                />
                {t("sources", { count: citations.length })}
            </CollapsibleTrigger>

            <CollapsibleContent>
                <ul className="mt-3 flex flex-col gap-2">
                    {citations.map((citation, index) => (
                        <CitationEntry
                            key={`${citation.documentId ?? citation.fileName}-${citation.page ?? index}`}
                            citation={citation}
                        />
                    ))}
                </ul>
            </CollapsibleContent>
        </Collapsible>
    );
}
